import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { Field, Int, ObjectType } from 'type-graphql';


@ObjectType() // using type-graphql we can use our entity as a graph ql type:
@Entity()
export class Post {
  @Field(() => Int) // this exposes each key to our schema, set the type inside the (). You must explicitly set the type:
  @PrimaryKey()
  id!: number;

  @Field(() => String)
  @Property({type: 'date'})
  createdAt = new Date();

  @Field(() => String)
  @Property({type: 'date', onUpdate: () => new Date()})
  updatedAt = new Date();

  @Field()
  @Property({type: 'text'})
  title!: string
};