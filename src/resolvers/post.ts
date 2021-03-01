import { Post } from "../entities/Post";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { MyContext } from "../types";

// Creates a resolver
@Resolver()
// This is a class resolver
export class PostResolver {
  // set the query type: an array of posts (Post must be a graphql type, see Post.ts)
  @Query(() => [Post])
  // Ctx is a context, check types.ts to see MyContext type. Promise<Post[]> is the return type
  posts(@Ctx() ctx: MyContext): Promise<Post[]> {
    // here we access ctx as the MyContext object (see types), and use the orm.em.find method to get all posts. 
    return ctx.em.find(Post, {})
  }
  // type is a single post or null, the object sets nullable to true
  @Query(() => Post, {nullable: true})
  post(
    // the argument parameter recieved for this query is called 'id', set the type in typescript
    @Arg('id') id:number, 
    // return type is set to post or null
    @Ctx() ctx: MyContext): Promise<Post | null> {
    // use findOne method to find one, pass the object to find it based on id 
    return ctx.em.findOne(Post, {id})
  }
  // mutations are for inserting, updating and deleting (queries are for getting)
  @Mutation(() => Post)
  async createPost(
    @Arg('title') title: string,
    @Ctx() ctx: MyContext): Promise<Post> {
      const post = ctx.em.create(Post, {title});
      await ctx.em.persistAndFlush(post);
      return post 
    }

  @Mutation(() => Post, {nullable: true})
  async updatePost(
    // if there is an arg/key that may not be required you can set nullable to true. You must set the type in graphql if your are going to set nullable
    @Arg('id') id: number,
    @Arg('title', () => String, {nullable: true}) title: string,
    @Ctx() ctx: MyContext): Promise<Post | null> {
      const post = await ctx.em.findOne(Post, {id});
      if(!post) {
        return null;
      }
      if(typeof title !== 'undefined'){
        post.title = title
        await ctx.em.persistAndFlush(post);
      }
      return post
    }

    @Mutation(() => Boolean)
    async deletePost(
      @Arg('id') id: number,
      @Ctx() ctx: MyContext): Promise<boolean> {
          try {
            await ctx.em.nativeDelete(Post, {id})
          } catch (error) {
            console.error(error);
            return false
          }
          return true
      }
};