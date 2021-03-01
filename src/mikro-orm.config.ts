import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { MikroORM } from "@mikro-orm/core";
import path from 'path';
import { User } from "./entities/User";

export default {
  migrations: {
    path: path.join(__dirname, './migrations'), // path to the folder with migrations
    patter: /^[\w-]+\d+\.[tj]s$/, // handles both ts and js files with [tj]
  },
  entities: [Post, User], // Our entities list which is a list of our data types
  dbName: 'lireddit', // Our DB name
  user: 'postgres', // user and password for postgres
  password: 'postgres', 
  type: 'postgresql', // type of database, which is postgresql
  debug: !__prod__ // debug, which should only be true in development
} as Parameters<typeof MikroORM.init>[0]; // This is setting the type of this object to the first parameter of the MikroOrm.init method

