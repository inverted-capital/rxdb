import { Observable } from 'rxjs';
import type { RxStorageInstance, RxStorageChangeEvent, RxDocumentData, BulkWriteRow, RxStorageBulkWriteResponse, RxStorageQueryResult, BlobBuffer, ChangeStreamOnceOptions, RxJsonSchema, RxStorageChangedDocumentMeta, RxStorageInstanceCreationParams, EventBulk, PreparedQuery } from '../../types';
import { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie';
import { RxStorageDexie } from './rx-storage-dexie';
export declare class RxStorageInstanceDexie<RxDocType> implements RxStorageInstance<RxDocType, DexieStorageInternals, DexieSettings> {
    readonly storage: RxStorageDexie;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocType>>;
    readonly internals: DexieStorageInternals;
    readonly options: Readonly<DexieSettings>;
    readonly settings: DexieSettings;
    readonly primaryPath: keyof RxDocType;
    private changes$;
    readonly instanceId: number;
    closed: boolean;
    constructor(storage: RxStorageDexie, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocType>>, internals: DexieStorageInternals, options: Readonly<DexieSettings>, settings: DexieSettings);
    /**
     * Adds entries to the changes feed
     * that can be queried to check which documents have been
     * changed since sequence X.
     */
    private addChangeDocumentsMeta;
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    bulkAddRevisions(documents: RxDocumentData<RxDocType>[]): Promise<void>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<{
        [documentId: string]: RxDocumentData<RxDocType>;
    }>;
    query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    getChangedDocuments(options: ChangeStreamOnceOptions): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[];
        lastSequence: number;
    }>;
    remove(): Promise<void>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>>;
    getAttachmentData(_documentId: string, _attachmentId: string): Promise<BlobBuffer>;
    close(): Promise<void>;
}
export declare function createDexieStorageInstance<RxDocType>(storage: RxStorageDexie, params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>, settings: DexieSettings): Promise<RxStorageInstanceDexie<RxDocType>>;
