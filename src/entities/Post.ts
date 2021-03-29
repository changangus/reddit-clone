import { Field, Int, ObjectType } from 'type-graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';


@ObjectType() // using type-graphql we can use our entity as a graph ql type:
@Entity()
export class Post extends BaseEntity {
  @Field(() => Int) // this exposes each key to our schema, set the type inside the (). You must explicitly set the type:
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt = Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt = Date;

  @Field()
  @Column()
  title!: string
};