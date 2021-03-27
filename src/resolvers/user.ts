import { MyContext } from 'src/types';
import { Arg, Ctx, Field, Mutation, ObjectType, Resolver, Query, Args } from 'type-graphql';
import argon2 from 'argon2';
import { User } from '../entities/User';
import { EntityManager } from '@mikro-orm/postgresql';
import { COOKIE_NAME } from '../constants';
import { UsernameEmailAndPasswordInput } from './UsernameEmailAndPasswordInput';
import { validateRegister } from '../utils/validateRegister';
@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
};

@ObjectType() // Object types you can return from your mutations
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
};

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(
    @Ctx() ctx: MyContext
  ) {
    // if there is no userId, then they are not logged in:
    if (!ctx.req.session.userId) {
      return null
    }

    const user = await ctx.em.findOne(User, { id: ctx.req.session.userId });
    return user
  }

  @Mutation(() => UserResponse) // set return type in ()
  async register(
    @Arg('options') options: UsernameEmailAndPasswordInput, // @Arg sets the args graphql is expecting, sql can infer the type from typescript
    @Ctx() ctx: MyContext): Promise<UserResponse> { // MyContext contains the em method from mikro-orm
    // validate register and return array of errors if there is an invalid input
    const errors = validateRegister(options);
    if (errors) {
      return { errors }
    };
    const hashedPassword = await argon2.hash(options.password); // argon2 is used to hash passwords
    // const user = ctx.em.create(User, {username: options.username, password: hashedPassword}); // create the user from the input types above
    let user;
    try {
      const result = await (ctx.em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          username: options.username,
          password: hashedPassword,
          email: options.email,
          created_at: new Date(),
          updated_at: new Date()
        }).returning("*");
      user = result[0];
      await ctx.em.persistAndFlush(user); // persist and flush to the datbase

    } catch (error) {
      if (error.code === '23505') {
        return {
          errors: [{
            field: 'username',
            message: 'Username is already taken'
          }]
        }
      }
    };

    // store userId session, this sets cookie on user and keeps them logged in:
    ctx.req.session.userId = user.id;

    return {
      user
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() ctx: MyContext): Promise<UserResponse> {
    const user = await ctx.em.findOne(User,
      usernameOrEmail.includes('@') ?
        { email: usernameOrEmail }
        : { username: usernameOrEmail });
    if (!user) {
      return {
        errors: [
          { field: 'username', message: 'Username is incorrect.' } // sets error message based on incorrect field
        ]
      }
    };
    const isValid = await argon2.verify(user.password, password); // first is the password from our retrieved user, second is the one passed in through the input
    if (!isValid) {
      return {
        errors: [
          { field: 'password', message: 'incorrect password' }
        ]
      }
    };

    ctx.req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  async logout(
    @Ctx() { req, res }: MyContext
  ) {
    return new Promise(resolve => req.session.destroy(err => {
      res.clearCookie(COOKIE_NAME);
      if (err) {
        console.log(err);
        resolve(false);
        return
      }
      resolve(true)
    }));
  }

  // @Mutation(() => Boolean)
  // async forgotPassword(
  //   @Args('email') email: string,
  //   @Ctx() { em }: MyContext
  // ){
  //   // const user = await em.findOne(User, {email})
  //   return true
  // }
}