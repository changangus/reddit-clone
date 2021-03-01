import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import microConfig from './mikro-orm.config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

const main = async () => {
  // MikroOrm setup:
  // initiate orm based on our config file
  const orm = await MikroORM.init(microConfig);
  orm.getMigrator().up();
  // creating an instance of express
  const app = express();
  // creating a new apollo server, to use graph ql se the schema using the buildSchema method from type-graphql
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver], // check resolvers folder
      validate: false,
    }),
    context: () => ({ em: orm.em })
  });
  const PORT = 4000;

  apolloServer.applyMiddleware({ app });

  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
  });

};

main().catch((err) => {
  console.error(err)
});


