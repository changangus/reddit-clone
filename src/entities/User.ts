import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { Field, ObjectType } from 'type-graphql';


@ObjectType() // using type-graphql we can use our entity as a graph ql type:
@Entity()
export class User {
  @Field() // this exposes each key to our schema, set the type inside the (). You must explicitly set the type:
  @PrimaryKey()
  id!: number;

  @Field(() => String)
  @Property({type: 'date'})
  createdAt = new Date();

  @Field(() => String)
  @Property({type: 'date', onUpdate: () => new Date()})
  updatedAt = new Date();

  @Field()
  @Property({type: 'text', unique: true}) // unique property sets this field to be uniqe compared to all the rest in the database
  username!: string

  // Removing the field property removes the ability to select the password from graphql
  @Property({type: 'text'})
  password!: string
};