import { Field, InputType } from 'type-graphql';

@InputType() // Input types are used for arguments
export class UsernameEmailAndPasswordInput {
  @Field()
  username: string;
  @Field()
  email: string;
  @Field()
  password: string;
}
;
