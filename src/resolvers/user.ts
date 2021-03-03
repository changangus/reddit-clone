import { MyContext } from 'src/types';
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Resolver, Query } from 'type-graphql';
import argon2 from 'argon2';
import { User } from '../entities/User';
@InputType() // Input types are used for arguments
class UsernameAndPasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
};

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
};

@ObjectType() // Object types you can return from your mutations
class UserResponse {
  @Field(() => [FieldError], {nullable: true})
  errors?: FieldError[];

  @Field(() => User, {nullable: true})
  user?: User;
};

@Resolver()
export class UserResolver {
  @Query(() => User, {nullable: true})
  async me(
    @Ctx() ctx: MyContext
  ) {
    console.log(ctx.req.session);
    // if there is no userId, then they are not logged in:
    if(!ctx.req.session.userId) {
      return null
    }

    const user = await ctx.em.findOne(User, {id: ctx.req.session.userId});
    return user
  }

  @Mutation(() => UserResponse) // set return type in ()
  async register (
    @Arg('options') options: UsernameAndPasswordInput, // @Arg sets the args graphql is expecting, sql can infer the type from typescript
    @Ctx() ctx: MyContext): Promise<UserResponse> { // MyContext contains the em method from mikro-orm
    if(options.username.length <= 2){
      return {
        errors: [{
          field: 'username',
          message: 'Username must be more than 2 characters'
        }]
      }
    };
    if(options.password.length < 8){
      return {
        errors: [{
          field: 'password',
          message: 'Password must at least 8 characters long'
        }]
      }
    };

    const hashedPassword = await argon2.hash(options.password); // argon2 is used to hash passwords
    const user = ctx.em.create(User, {username: options.username, password: hashedPassword}); // create the user from the input types above
    try {
      await ctx.em.persistAndFlush(user); // persist and flush to the datbase

    } catch (error) {
      if(error.code === '23505'){
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
  async login (
    @Arg('options') options: UsernameAndPasswordInput,
    @Ctx() ctx: MyContext): Promise<UserResponse> {
    const user = await ctx.em.findOne(User, { username: options.username});
    if(!user) {
      return {
        errors: [
          {field: 'username', message: 'Username is incorrect.'} // sets error message based on incorrect field
        ]
      }
    };
    const isValid = await argon2.verify(user.password, options.password); // first is the password from our retrieved user, second is the one passed in through the input
    if(!isValid){
      return {
        errors: [
          {field: 'password', message: 'incorrect password'}
        ]
      }
    };

    ctx.req.session.userId = user.id;

    return  {
      user,
    };
  }
}