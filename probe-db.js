const { MongoClient } = require('mongodb');

async function debugPort() {
    const uri = "mongodb://127.0.0.1:27017";
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });

    try {
        console.log("Probing 127.0.0.1:27017...");
        await client.connect();
        const admin = client.db('admin');
        const isMaster = await admin.command({ isMaster: 1 });
        console.log("Server Info:", JSON.stringify(isMaster, null, 2));

        if (isMaster.setName) {
            console.log("Replica Set name is:", isMaster.setName);
        } else {
            console.log("This is NOT a replica set node.");
        }

    } catch (err) {
        console.error("Probe Error:", err.message);
    } finally {
        await client.close();
    }
}

debugPort();
