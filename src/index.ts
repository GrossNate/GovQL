import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import mongoose from 'mongoose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { schemaComposer } from 'graphql-compose';
import { EnvelopArmor } from '@escape.tech/graphql-armor';
import dotenvx from '@dotenvx/dotenvx';
import { useRateLimiter } from '@envelop/rate-limiter';
import {
  GraphQLDirective,
  DirectiveLocation,
  GraphQLInt,
  GraphQLString,
  GraphQLError,
} from 'graphql';

dotenvx.config();

const MONGO_URI = process.env.MONGO_URI ?? '';

const armor = new EnvelopArmor();
const protection = armor.protect();

// STEP 1: DEFINE MONGOOSE SCHEMA AND MODEL

const BillSchema = new mongoose.Schema(
  {
    congress: Number,
    number: Number,
    title: String,
    type: String,
  },
  { _id: false }
);
const CongressVoterSchema = new mongoose.Schema(
  {
    display_name: String,
    first_name: String,
    id: String,
    last_name: String,
    party: String,
    state: String,
  },
  { _id: false }
);
const VoteSchema = new mongoose.Schema(
  {
    Nay: { type: [CongressVoterSchema], default: [] },
    'Not Voting': {
      type: [CongressVoterSchema],
      default: [],
      alias: 'Not_Voting',
    },
    Present: { type: [CongressVoterSchema], default: [] },
    Yea: { type: [CongressVoterSchema], default: [] },
  },
  { _id: false }
);
const AmendmentSchema = new mongoose.Schema(
  {
    number: Number,
    purpose: String,
    type: String,
  },
  { _id: false }
);
const NominationSchema = new mongoose.Schema(
  {
    number: String,
    title: String,
  },
  { _id: false }
);
const VoteContainerSchema = new mongoose.Schema({
  amendment: AmendmentSchema,
  bill: BillSchema,
  nomination: NominationSchema,
  category: String,
  chamber: String,
  congress: Number,
  date: String,
  number: Number,
  question: String,
  record_modified: String,
  requires: String,
  result: String,
  result_text: String,
  session: String,
  source_url: String,
  subject: String,
  type: String,
  updated_at: String,
  vote_id: String,
  votes: { type: [VoteSchema], default: [] },
});

const VoteContainer = mongoose.model('votes', VoteContainerSchema);

// STEP 2: CONVERT MONGOOSE MODEL TO GraphQL PIECES

// TODO: figure out how to resolve the TS error without ignoring.
// @ts-ignore
const VoteContainerTC = composeMongoose(VoteContainer);

// STEP 3: ADD NEEDED CRUD USER OPERATIONS TO THE GraphQL SCHEMA
schemaComposer.Query.addFields({
  voteOne: VoteContainerTC.mongooseResolvers.findOne(),
  voteMany: VoteContainerTC.mongooseResolvers.findMany(),
  voteCount: VoteContainerTC.mongooseResolvers.count(),
});

const rateLimitDirective = new GraphQLDirective({
  name: 'rateLimit',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    max: { type: GraphQLInt },
    window: { type: GraphQLString },
    message: { type: GraphQLString },
  },
});

schemaComposer.addDirective(rateLimitDirective);

schemaComposer.Query.setFieldDirectiveByName('voteOne', 'rateLimit', {
  max: 10,
  window: '30s',
  message: "You're limited!",
});

schemaComposer.Query.setFieldDirectiveByName('voteMany', 'rateLimit', {
  max: 10,
  window: '30s',
  message: "You're limited!",
});
schemaComposer.Query.setFieldDirectiveByName('voteCount', 'rateLimit', {
  max: 10,
  window: '30s',
  message: "You're limited!",
});
// STEP 4: BUILD GraphQL SCHEMA OBJECT
const schema = schemaComposer.buildSchema();
export default schema;

// LAST STEP: Actually start running the server
const yoga = createYoga({
  schema,
  plugins: [
    ...protection.plugins,
    useRateLimiter({
      identifyFn: (context: any) => context?.ip ?? null,
      onRateLimitError(event) {
        throw new GraphQLError(event.error);
      },
    }),
  ],
  context: ({ request }) => {
    const ip = request.headers.get('ip') ?? null;
    return { ip };
  },
});

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }

  const server = createServer(yoga);

  server.listen(4000, () => {
    console.info('Server is running on http://localhost:4000/graphql');
  });
})();
