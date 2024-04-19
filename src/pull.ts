import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname } from  "node:path"

const prisma = new PrismaClient();
const buckets = await prisma.buckets.findMany({})

// storage
await rm('./storage', {recursive:true})
const objects = await prisma.objects.findMany({})
for (const object of objects) {
    const bucket = buckets.find(bucket => bucket.id === object.bucket_id)!
    if (bucket.public) {
        const req = await fetch(`http://localhost:8000/storage/v1/object/public/${bucket.id}/${object.name}`)
        await mkdir(dirname(new URL(import.meta.resolve(`../storage/${object.bucket_id}/${object.name}`)).pathname), {recursive:true})
        await writeFile(`./storage/${bucket.id}/${object.name}`, Buffer.from(await req.arrayBuffer()))
    } else console.warn(`Object ${object.id} is private`)
}

// database
const tables = await prisma.$queryRaw`
    select * from information_schema.tables
    where table_schema = 'public'
    and table_type = 'BASE TABLE';
`
const db = {}
// @ts-ignore
for (const table_name of (tables as any[]).map(t => t.table_name) as string[]) db[table_name] = await prisma[table_name].findMany({})
await writeFile('./db.json', JSON.stringify(
    db, 
    (k,v) => typeof v === 'bigint' ? v.toString() : v, 
    4
))