const fs = require('fs');
const axios = require('axios');

// Configurations
const API_BASE_URL = 'https://sipedas.pertanian.go.id/api/wilayah';
const API_YEAR = '2024';
const OUTPUT_DIR = 'output';
const OUTPUT_FILE = 'indonesia.json';

async function fetchProvinces() {
  try {
    console.log('Sedang mengambil data provinsi...');
    const response = await axios.get(`${API_BASE_URL}/list_pro?thn=${API_YEAR}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching provinces:', error.message);
    throw error;
  }
}

async function fetchRegencies(provinceId) {
  try {
    console.log(`Sedang mengambil data kabupaten/kota untuk provinsi ${provinceId}...`);
    const response = await axios.get(`${API_BASE_URL}/list_kab?thn=${API_YEAR}&pro=${provinceId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching regencies for province ${provinceId}:`, error.message);
    throw error;
  }
}

async function fetchDistricts(provinceId, regencyCode) {
  try {
    console.log(`Sedang mengambil data kecamatan untuk provinsi ${provinceId} dan kabupaten ${regencyCode}...`);
    const response = await axios.get(`${API_BASE_URL}/list_kec?thn=${API_YEAR}&pro=${provinceId}&kab=${regencyCode}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching districts for province ${provinceId} and regency ${regencyCode}:`, error.message);
    throw error;
  }
}

async function fetchVillages(provinceId, regencyCode, districtCode) {
  try {
    console.log(`Sedang mengambil data desa untuk provinsi ${provinceId}, kabupaten ${regencyCode}, dan kecamatan ${districtCode}...`);
    const response = await axios.get(`${API_BASE_URL}/list_des?thn=${API_YEAR}&pro=${provinceId}&kab=${regencyCode}&kec=${districtCode}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching villages for province ${provinceId}, regency ${regencyCode}, and district ${districtCode}:`, error.message);
    throw error;
  }
}

function saveToJSON(data, outputDir, outputFile) {
  const outputPath = `${outputDir}/${outputFile}`;

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Data berhasil disimpan ke ${outputPath}`);
  } catch (error) {
    console.error(`Error saving data to ${outputPath}:`, error.message);
    throw error;
  }
}

async function fetchData() {
  const indonesiaData = {
    provinces: [],
    regencies: [],
    districts: [],
    villages: []
  };

  try {
    // Fetch provinces
    const provinces = await fetchProvinces();
    for (const [id, name] of Object.entries(provinces)) {
      indonesiaData.provinces.push({ id, name });
    }

    // Fetch regencies for each province
    const regencyPromises = indonesiaData.provinces.map(async (province) => {
      const regencies = await fetchRegencies(province.id);
      for (const [code, name] of Object.entries(regencies)) {
        const id = `${province.id}${code}`;
        indonesiaData.regencies.push({ id, province_id: province.id, name });

        // Fetch districts for each regency
        const districtPromises = await fetchDistricts(province.id, code);
        for (const [distCode, distName] of Object.entries(districtPromises)) {
          const districtId = `${id}${distCode}`;
          indonesiaData.districts.push({ id: districtId, regency_id: id, name: distName });

          // Fetch villages for each district
          const villages = await fetchVillages(province.id, code, distCode);
          for (const [villageCode, villageName] of Object.entries(villages)) {
            const villageId = `${districtId}${villageCode}`;
            indonesiaData.villages.push({ id: villageId, district_id: districtId, name: villageName });
          }
        }
      }
    });

    await Promise.all(regencyPromises);

    // Save all data to JSON
    saveToJSON(indonesiaData, OUTPUT_DIR, OUTPUT_FILE);

    console.log('Proses fetching data selesai.');
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

fetchData();
