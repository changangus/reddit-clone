import { Field, ObjectType } from 'type-graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';


@ObjectType() // using type-graphql we can use our entity as a graph ql type:
@Entity()
export class User extends BaseEntity {
  @Field() // this exposes each key to our schema, set the type inside the (). You must explicitly set the type:
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt = Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt = Date;

  @Field()
  @Column({unique: true}) // unique property sets this field to be uniqe compared to all the rest in the database
  username!: string

  @Field()
  @Column({unique: true})
  email!: string

  // Removing the field property removes the ability to select the password from graphql
  @Column()
  password!: string
};