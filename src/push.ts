import db from '../db.json' with { type: 'json' }
import { PrismaClient } from "@prisma/client";
import { readFile, readdir } from 'node:fs/promises'

const prisma = new PrismaClient();
console.log(process.env.SERVICE_KEY);
console.log(process.env.ANON_KEY);

// database
for (const table_name in db) {
    // @ts-ignore
    const x = await prisma[table_name].deleteMany({})
    
    // @ts-ignore
    if (db[table_name].length) console.log(`Creating`, db[table_name].length, `rows in ${table_name}`);
    // @ts-ignore
    for (const row of db[table_name]) {
        try {
            // @ts-ignore
        await prisma[table_name].create({
            data: row
        })
        } catch (error) {
            if (!(error as Error).message.includes('functions_start_at_check'))
            console.log((error as Error).message);
        }
    }
}

// storage
await prisma.objects.deleteMany({})
await prisma.buckets.deleteMany({})
for (const bucket of await readdir('./storage')) {
    await prisma.buckets.create({
        data: {
            id: bucket,
            public: true,
            name: bucket
        }
    })
    for (const object of await readdir(`./storage/${bucket}`, {recursive:true, withFileTypes:true})) {
        if (object.isDirectory()) continue
        let path = object.path.replace(`storage/${bucket}/`, '')
        if (path) path += `/` + object.name
        else path = object.name
        const form = new FormData()
        const file = await readFile('./'+object.path+'/'+object.name)
        form.append('file', new Blob([file]), object.name)
        const req = await fetch(`http://localhost:8000/storage/v1/object/${bucket}/${path}`, {
            method: 'POST',
            headers: {
                apikey: `${process.env.ANON_KEY}`,
                authorization: `Bearer ${process.env.SERVICE_KEY}`
            },
            body: form
        })
        console.log(await req.text());
    }
}
