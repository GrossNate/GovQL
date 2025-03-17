"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
const node_http_1 = require("node:http");
const graphql_yoga_1 = require("graphql-yoga");
const mongoose_1 = __importDefault(require("mongoose"));
const graphql_compose_mongoose_1 = require("graphql-compose-mongoose");
const graphql_compose_1 = require("graphql-compose");
// import { EnvelopArmor } from '@escape.tech/graphql-armor';
const dotenvx_1 = __importDefault(require("@dotenvx/dotenvx"));
const rate_limiter_1 = require("@envelop/rate-limiter");
const graphql_1 = require("graphql");
// import { usePrometheus } from '@graphql-yoga/plugin-prometheus';
const opentelemetry_1 = require("@envelop/opentelemetry");
dotenvx_1.default.config();
const MONGO_URI = (_a = process.env.MONGO_URI) !== null && _a !== void 0 ? _a : '';
// const armor = new EnvelopArmor();
// const protection = armor.protect();
const BillSchema = new mongoose_1.default.Schema({
    congress: Number,
    number: Number,
    title: String,
    type: String,
}, { _id: false });
const CongressVoterSchema = new mongoose_1.default.Schema({
    display_name: String,
    first_name: String,
    id: String,
    last_name: String,
    party: String,
    state: String,
}, { _id: false });
const VoteSchema = new mongoose_1.default.Schema({
    Nay: { type: [CongressVoterSchema], default: [] },
    'Not Voting': {
        type: [CongressVoterSchema],
        default: [],
        alias: 'Not_Voting',
    },
    Present: { type: [CongressVoterSchema], default: [] },
    Yea: { type: [CongressVoterSchema], default: [] },
}, { _id: false });
const AmendmentSchema = new mongoose_1.default.Schema({
    number: Number,
    purpose: String,
    type: String,
}, { _id: false });
const NominationSchema = new mongoose_1.default.Schema({
    number: String,
    title: String,
}, { _id: false });
const VoteContainerSchema = new mongoose_1.default.Schema({
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
const VoteContainer = mongoose_1.default.model('votes', VoteContainerSchema);
// TODO: figure out how to resolve the TS error without ignoring.
// @ts-ignore
const VoteContainerTC = (0, graphql_compose_mongoose_1.composeMongoose)(VoteContainer);
// STEP 2.5: Create some filters
const votedYeaFilter = {
    name: 'votedYea',
    type: 'String',
    description: 'Filter votes by yeas from a Congressperson',
    query: (query, value) => {
        query['votes.Yea.last_name'] = { $in: [value] };
    },
};
const votedNayFilter = {
    name: 'votedNay',
    type: 'String',
    description: 'Filter votes by nays from a Congressperson',
    query: (query, value) => {
        query['votes.Nay.last_name'] = { $in: [value] };
    },
};
graphql_compose_1.schemaComposer.Query.addFields({
    voteOne: VoteContainerTC.mongooseResolvers
        .findOne()
        .addFilterArg(votedYeaFilter)
        .addFilterArg(votedNayFilter),
    voteMany: VoteContainerTC.mongooseResolvers
        .findMany()
        .addFilterArg(votedYeaFilter)
        .addFilterArg(votedNayFilter),
    voteCount: VoteContainerTC.mongooseResolvers
        .count()
        .addFilterArg(votedYeaFilter)
        .addFilterArg(votedNayFilter),
});
const rateLimitDirective = new graphql_1.GraphQLDirective({
    name: 'rateLimit',
    locations: [graphql_1.DirectiveLocation.FIELD_DEFINITION],
    args: {
        max: { type: graphql_1.GraphQLInt },
        window: { type: graphql_1.GraphQLString },
        message: { type: graphql_1.GraphQLString },
    },
});
graphql_compose_1.schemaComposer.addDirective(rateLimitDirective);
graphql_compose_1.schemaComposer.Query.setFieldDirectiveByName('voteOne', 'rateLimit', {
    max: 10,
    window: '30s',
});
graphql_compose_1.schemaComposer.Query.setFieldDirectiveByName('voteMany', 'rateLimit', {
    max: 10,
    window: '30s',
});
graphql_compose_1.schemaComposer.Query.setFieldDirectiveByName('voteCount', 'rateLimit', {
    max: 10,
    window: '30s',
});
exports.schema = graphql_compose_1.schemaComposer.buildSchema();
console.log((0, graphql_1.printSchema)(exports.schema));
const yoga = (0, graphql_yoga_1.createYoga)({
    schema: exports.schema,
    plugins: [
        // ...protection.plugins,
        (0, rate_limiter_1.useRateLimiter)({
            identifyFn: (context) => { var _a; return (_a = context === null || context === void 0 ? void 0 : context.ip) !== null && _a !== void 0 ? _a : null; },
            onRateLimitError() {
                throw new graphql_1.GraphQLError("You've been rate limited! Cool your heels and try again later.");
            },
        }),
        // usePrometheus({
        //   endpoint: '/metrics', // optional, default is `/metrics`, you can disable it by setting it to `false` if registry is configured in "push" mode
        //   // Optional, see default values below
        //   metrics: {
        //     // By default, these are the metrics that are enabled:
        //     graphql_envelop_request_time_summary: true,
        //     graphql_envelop_phase_parse: true,
        //     graphql_envelop_phase_validate: true,
        //     graphql_envelop_phase_context: true,
        //     graphql_envelop_phase_execute: true,
        //     graphql_envelop_phase_subscribe: true,
        //     graphql_envelop_error_result: true,
        //     graphql_envelop_deprecated_field: true,
        //     graphql_envelop_request_duration: true,
        //     graphql_envelop_schema_change: true,
        //     graphql_envelop_request: true,
        //     graphql_yoga_http_duration: true,
        //     // This metric is disabled by default.
        //     // Warning: enabling resolvers level metrics will introduce significant overhead
        //     graphql_envelop_execute_resolver: false,
        //   },
        // }),
        (0, opentelemetry_1.useOpenTelemetry)({
            resolvers: true, // Tracks resolvers calls, and tracks resolvers thrown errors
            variables: true, // Includes the operation variables values as part of the metadata collected
            result: true, // Includes execution result object as part of the metadata collected
        }),
    ],
    context: ({ request }) => {
        var _a;
        const ip = (_a = request.headers.get('ip')) !== null && _a !== void 0 ? _a : null;
        return { ip };
    },
    graphiql: {
        defaultQuery: `
query {
  voteMany(filter: {votedYea: "Durbin", votedNay: "Duckworth"}) {
    vote_id
    question
    result
    type
    date
  }
}
    `,
    },
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(MONGO_URI);
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
    const server = (0, node_http_1.createServer)(yoga);
    server.listen(4000, () => {
        console.info('Server is running on http://localhost:4000/graphql');
    });
}))();
