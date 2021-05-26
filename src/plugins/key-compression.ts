/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

import {
    createCompressionTable,
    CompressionTable,
    JsonSchema as KeyCompressionJsonSchema,
    compressObject,
    PlainJsonObject,
    decompressObject,
    compressedPath,
    compressQuery,
    DEFAULT_COMPRESSION_FLAG,
    createCompressedJsonSchema
} from 'jsonschema-key-compression';

import {
    RxSchema,
    getPrimary
} from '../rx-schema';
import type {
    RxPlugin,
    RxJsonSchema,
    RxCollection
} from '../types';
import {
    overwriteGetterForCaching
} from '../util';


declare type CompressionState = {
    table: CompressionTable;
    // the compressed schema
    schema: RxJsonSchema;
}

/**
 * Cache the compression table and the compressed schema
 * by the storage instance for better performance.
 */
const COMPRESSION_STATE_BY_COLLECTION: WeakMap<
    RxCollection,
    CompressionState
> = new WeakMap();

export function createCompressionState(
    schema: RxJsonSchema
): CompressionState {
    const primaryPath = getPrimary(schema);
    const table = createCompressionTable(
        schema as KeyCompressionJsonSchema,
        DEFAULT_COMPRESSION_FLAG,
        [
            /**
             * Do not compress the primary path
             * to make it easier to debug errors.
             */
            primaryPath,
            '_rev',
            '_attachments'
        ]
    );
    const compressedSchema: RxJsonSchema = createCompressedJsonSchema(
        table,
        schema as KeyCompressionJsonSchema
    ) as RxJsonSchema;

    /**
     * the key compression module does not know about indexes
     * in the schema, so we have to also compress them here.
     */
    if (schema.indexes) {
        const newIndexes = schema.indexes.map(idx => {
            if (Array.isArray(idx)) {
                return idx.map(subIdx => compressedPath(table, subIdx));
            } else {
                return compressedPath(table, idx);
            }
        });
        compressedSchema.indexes = newIndexes;
    }

    return {
        table,
        schema: compressedSchema
    }
}

export function getCompressionStateByStorageInstance(
    collection: RxCollection
): CompressionState {
    let state = COMPRESSION_STATE_BY_COLLECTION.get(collection);
    if (!state) {
        state = createCompressionState(collection.schema.jsonSchema);
        COMPRESSION_STATE_BY_COLLECTION.set(collection, state);
    }
    return state;
}

export const rxdb = true;
export const prototypes = {};
export const overwritable = {};

export const RxDBKeyCompressionPlugin: RxPlugin = {
    name: 'key-compression',
    rxdb,
    prototypes,
    overwritable,
    hooks: {
        /**
         * replace the keys of a query-obj with the compressed keys
         * because the storage instance only know the compressed schema
         * @return compressed queryJSON
         */
        prePrepareQuery(
            input
        ) {
            const rxQuery = input.rxQuery;
            const mangoQuery = input.mangoQuery;

            if (!rxQuery.collection.schema.jsonSchema.keyCompression) {
                return;
            }
            const compressionState = getCompressionStateByStorageInstance(
                rxQuery.collection
            );

            const compressedQuery = compressQuery(
                compressionState.table,
                mangoQuery as any
            );
            input.mangoQuery = compressedQuery as any;
        },
        preCreateRxStorageInstance(params) {
            /**
             * When key compression is used,
             * the storage instance only knows about the compressed schema
             */
            if (params.schema.keyCompression) {
                const compressionState = createCompressionState(params.schema);
                params.schema = compressionState.schema;
            }
        },
        preQueryMatcher(params) {
            if (!params.rxQuery.collection.schema.jsonSchema.keyCompression) {
                return;
            }
            const state = getCompressionStateByStorageInstance(params.rxQuery.collection);
            console.log('preQueryMatcher:');
            console.dir(params.doc);
            params.doc = compressObject(
                state.table,
                params.doc
            );
        },
        preSortComparator(params) {
            if (!params.rxQuery.collection.schema.jsonSchema.keyCompression) {
                return;
            }
            const state = getCompressionStateByStorageInstance(params.rxQuery.collection);
            params.docA = compressObject(
                state.table,
                params.docA
            );
            params.docB = compressObject(
                state.table,
                params.docB
            );
        },
        preWriteToStorageInstance(params) {
            if (!params.collection.schema.jsonSchema.keyCompression) {
                return;
            }
            const state = getCompressionStateByStorageInstance(params.collection);
            params.doc = compressObject(
                state.table,
                params.doc
            );
        },
        postReadFromInstance(params) {
            if (!params.collection.schema.jsonSchema.keyCompression) {
                return;
            }
            const state = getCompressionStateByStorageInstance(params.collection);
            params.doc = decompressObject(
                state.table,
                params.doc
            );
        }
    }
};
