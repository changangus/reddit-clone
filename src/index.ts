import 'reflect-metadata';
import 'colors';
import { MikroORM } from '@mikro-orm/core';
import { COOKIE_NAME, __prod__ } from './constants';
import microConfig from './mikro-orm.config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { MyContext } from './types';
import cors from 'cors';

const main = async () => {
  // MikroOrm setup:
  // initiate orm based on our config file
  const orm = await MikroORM.init(microConfig);
  orm.getMigrator().up();
  // creating an instance of express
  const app = express();
  // connecting redis to our express session
  const RedisStore = connectRedis(session);
  // creating a redis client instance
  const redis = new Redis();
  // applying cors middleware
  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    })
  );
  // using express session, config below:
  app.use(
    session({
      name: COOKIE_NAME, //name of the cookies
      store: new RedisStore({
        // telling express session we're using redis and modifying settings
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        // settings for our cookies:
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        secure: __prod__, // cookie only works in https
        sameSite: 'lax', // protecting csrf
      },
      saveUninitialized: false,
      secret: 'env_variable', // secret to sign your cookie
      resave: false, // to avoid constant pings
    })
  );
  // creating a new apollo server, to use graph ql se the schema using the buildSchema method from type-graphql
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver], // check resolvers folder
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res, redis }),
  });
  const PORT = 4000;

  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`.cyan.bold);
  });
};

main().catch((err) => {
  console.error(err);
});
