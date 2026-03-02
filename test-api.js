async function testPost() {
    try {
        const res = await fetch('http://localhost:3000/api/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Role',
                description: 'Test Description',
                permissions: []
            })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch (e) {
        console.error("Error:", e);
    }
}
testPost();
