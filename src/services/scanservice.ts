export async function scanLabel(imageFile: File) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetch('http://localhost:5000/scan', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Scan failed with status ${res.status}`);
  }

  return res.json(); // { inspection_id, extracted_data, compliance_report }
}