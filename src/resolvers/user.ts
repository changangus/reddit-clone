import { MyContext } from 'src/types';
import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Resolver,
  Query,
} from 'type-graphql';
import argon2 from 'argon2';
import { User } from '../entities/User';
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from '../constants';
import { UsernameEmailAndPasswordInput } from './UsernameEmailAndPasswordInput';
import { validateRegister } from '../utils/validateRegister';
import { sendEmail } from '../utils/sendEmail';
import { v4 } from 'uuid';
import { getConnection } from 'typeorm';
@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType() // Object types you can return from your mutations
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    // if there is no userId, then they are not logged in:
    if (!req.session.userId) {
      return null;
    }

    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse) // set return type in ()
  async register(
    @Arg('options') options: UsernameEmailAndPasswordInput, // @Arg sets the args graphql is expecting, sql can infer the type from typescript
    @Ctx() ctx: MyContext
  ): Promise<UserResponse> {
    // MyContext contains the em method from mikro-orm
    // validate register and return array of errors if there is an invalid input
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }
    const hashedPassword = await argon2.hash(options.password); // argon2 is used to hash passwords
    let user;
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          email: options.email,
          password: hashedPassword,
        })
        .returning('*')
        .execute();
      user = result.raw[0];
      await User.create(user);
    } catch (error) {
      console.log(error);
      if (error.code === '23505') {
        return {
          errors: [
            {
              field: 'username',
              message: 'Username is already taken',
            },
          ],
        };
      }
    }

    // store userId session, this sets cookie on user and keeps them logged in:
    ctx.req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() ctx: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes('@')
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    );
    if (!user) {
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: 'Username or Email is incorrect.',
          }, // sets error message based on incorrect field
        ],
      };
    }
    const isValid = await argon2.verify(user.password, password); // first is the password from our retrieved user, second is the one passed in through the input
    if (!isValid) {
      return {
        errors: [{ field: 'password', message: 'incorrect password' }],
      };
    }

    ctx.req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // email is not in DB
      return true;
    }
    const token = v4();

    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      'ex',
      1000 * 60 * 60
    );

    const text = `<a href='http://localhost:3000/change-password/${token}'>Reset Password</a>`;
    await sendEmail(email, text);

    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length < 8) {
      return {
        errors: [
          {
            field: 'newPassword',
            message: 'password must be longer than 8 characters',
          },
        ],
      };
    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);

    if (!userId) {
      return {
        errors: [
          {
            field: 'token',
            message: 'token expired',
          },
        ],
      };
    }

    const userIdNum = parseInt(userId);
    const user = await User.findOne(userIdNum);

    if (!user) {
      return {
        errors: [
          {
            field: 'token',
            message: 'user no longer exists',
          },
        ],
      };
    }

    User.update(
      { id: userIdNum },
      {
        password: await argon2.hash(newPassword),
      }
    );

    req.session.userId = user.id;

    redis.del(key);

    return {
      user,
    };
  }
}
