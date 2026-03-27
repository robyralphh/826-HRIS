async function debug() {
  const periodId = '69b57f2379a61efc1de7facc'; // From the previous dump
  const url = `http://localhost:3000/api/payroll/process/${periodId}`;
  
  console.log(`Triggering payroll process for period: ${periodId}`);
  try {
    const response = await fetch(url, { method: 'POST' });
    const text = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Body:', text);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

debug();
