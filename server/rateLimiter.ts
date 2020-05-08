const { ApolloServer, SchemaDirectiveVisitor } = require('apollo-server');
import {
  defaultFieldResolver,
  GraphQLField,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLError,
  GraphQLSchema,
  GraphQLType,
  GraphQLNamedType,
} from 'graphql';
import { type } from 'os';
const asyncRedis = require('async-redis');
const redis = require('redis');
const client = asyncRedis.createClient();

// Redis Rate Limiter -------------------------------------------
const rateLimiter = async (limit: number, ip: string, scope: string) => {
  const expirationTimeVariable = 10; // NEED TO CHANGE
  const key = ip + '_' + scope;

  let exists = await client.exists(key);

  if (exists === 0) {
    await client.setex(key, expirationTimeVariable, 1);
    return true;
  } else {
    await client.incr(key);
    let value = await client.get(key);
    value = Number(value);

    if (value > limit) {
      return false;
    } else {
      return true;
    }
    
  }
};
//---------------------------------------------------------------

export class portaraSchemaDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>, details) {
    const { limit } = this.args;
    const { resolve = defaultFieldResolver } = field;

    field.resolve = async (...ogArgs) => {
      const [object, args, context, info] = ogArgs;
      const underLimit = await rateLimiter(limit, context.req.ip, info.fieldName);
      if (underLimit) {
        return resolve(...ogArgs);
      } else return new Error('Over Limit');
    };
  }
}
// visitObject(type: GraphQLObjectType) {
//   const { limit } = this.args;
//   const fields = type.getFields();
//   const variables = {};
//   const func = rateLimiter(limit);
//   Object.values(fields).forEach((field) => {
//     if (!field.astNode!.directives!.some((directive) => directive.name.value === 'portara')) {
//       variables[field.name] = field.resolve;
//       field.resolve = (object, args, context, info) => {
//         func();
//         return variables[field.name]();
//       };
//     }
//   });
// }
// visitSchema(schema: GraphQLSchema) {
//   const { limit } = this.args;
//   const func = rateLimiter(limit);
//   // Store all root types in an object
//   const allTypes = {}
//   Object.assign(allTypes, schema.getQueryType()?.getFields(), schema.getMutationType()?.getFields(), schema.getSubscriptionType()?.getFields())
//   Object.values(allTypes).forEach((field:any) => {
//     // console.log(field)
//     // if ()
//     if (!field.astNode!.directives!.some((directive) => directive.name.value === 'portara')) {
//       if (field.resolve) {
//         allTypes[field.name] = field.resolve;
//         field.resolve = (object, args, context, info) => {
//           func();
//           return allTypes[field.name]();
//         };
//       }
//     }
//   })
//   }
// }
// Redis Connection:
/*
Endpoint:
redis-11068.c98.us-east-1-4.ec2.cloud.redislabs.com:11068
In Terminal:
redis-cli -h redis-11068.c98.us-east-1-4.ec2.cloud.redislabs.com -p 11068 -a cats35_ql
*/
