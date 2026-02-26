declare module 'multer' {
    import type { RequestHandler } from 'express';

    interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
    }

    interface Options {
        storage?: any;
        fileFilter?: (req: any, file: File, cb: (error: Error | null, accept?: boolean) => void) => void;
        limits?: {
            fileSize?: number;
            files?: number;
        };
    }

    interface Multer {
        single(fieldname: string): RequestHandler;
        array(fieldname: string, maxCount?: number): RequestHandler;
        none(): RequestHandler;
    }

    function multer(options?: Options): Multer;

    namespace multer {
        function memoryStorage(): any;
        function diskStorage(opts: any): any;
    }

    export = multer;
}
