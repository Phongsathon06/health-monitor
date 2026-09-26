// ตั้งค่ารหัสผ่านเข้าโซนพยาบาล
const NURSE_PASSWORD = "1234"; 

// ตั้งค่า Supabase Project URL และ Publishable key
const SUPABASE_URL = 'https://gmgsthzchdudeuarcprc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tb8NDpc1ulRIvmJuAqSJwQ_EyxqC8SN';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let allPatientsData = [];
let globalRecords = [];

// ตรวจสอบสิทธิ์พยาบาลเบื้องต้นเมื่อเปิดหน้า nurse.html
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('selectVillage')) {
        fetchPatientsMasterData();
    }
    
    if (document.getElementById('dataTableBody')) {
        checkNurseAccessOnLoad();
    }
});

// 1. ดึงข้อมูลทั้งหมดจากตารางใน Supabase สำหรับหน้า อสม.
async function fetchPatientsMasterData() {
    try {
        const { data, error } = await supabaseClient
            .from('health_records')
            .select('id_card, fullname, house_no, village_no, subdistrict, age');

        if (error) {
            console.error('Error fetching data:', error.message);
            return;
        }

        allPatientsData = data || [];
        populateVillageDropdown();
    } catch (err) {
        console.error('Connection error:', err);
    }
}

// 2. สร้างรายการหมู่ใน Dropdown อัตโนมัติ
function populateVillageDropdown() {
    const villageSelect = document.getElementById('selectVillage');
    if (!villageSelect) return;
    villageSelect.innerHTML = '<option value="">-- เลือกหมู่ที่ --</option>';

    const villages = [...new Set(allPatientsData.map(p => p.village_no))]
        .filter(v => v !== null && v !== undefined && v !== '');

    villages.sort((a, b) => parseInt(a) - parseInt(b));

    villages.forEach(v => {
        let opt = document.createElement('option');
        opt.value = v;
        opt.textContent = `หมู่ ${v}`;
        villageSelect.appendChild(opt);
    });
}

// 3. กรองรายชื่อคนไข้ตามหมู่ที่เลือก
function filterPatientsByVillage() {
    const selectedVillage = document.getElementById('selectVillage').value;
    const patientSelect = document.getElementById('selectPatient');
    
    patientSelect.innerHTML = '<option value="">-- เลือกชื่อ - นามสกุล --</option>';
    
    if (!selectedVillage) {
        patientSelect.disabled = true;
        clearAutoFillFields();
        return;
    }

    const filtered = allPatientsData.filter(p => String(p.village_no) === String(selectedVillage));

    filtered.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p.id_card;
        opt.textContent = p.fullname;
        patientSelect.appendChild(opt);
    });

    patientSelect.disabled = false;
    clearAutoFillFields();
}

// 4. อัปเดตข้อมูลอัตโนมัติเมื่อเลือกชื่อคนไข้
function autoFillPatientData() {
    const selectedIdCard = document.getElementById('selectPatient').value;
    if (!selectedIdCard) {
        clearAutoFillFields();
        return;
    }

    const patient = allPatientsData.find(p => p.id_card === selectedIdCard);
    if (patient) {
        document.getElementById('idCard').value = patient.id_card || '';
        document.getElementById('age').value = patient.age || '';
        document.getElementById('houseNo').value = patient.house_no || '';
        document.getElementById('villageAndSubdistrict').value = `ม.${patient.village_no || ''} ${patient.subdistrict || ''}`;
    }
}

function clearAutoFillFields() {
    if(document.getElementById('idCard')) document.getElementById('idCard').value = '';
    if(document.getElementById('age')) document.getElementById('age').value = '';
    if(document.getElementById('houseNo')) document.getElementById('houseNo').value = '';
    if(document.getElementById('villageAndSubdistrict')) document.getElementById('villageAndSubdistrict').value = '';
}

// 5. บันทึกข้อมูลจากฟอร์ม อสม.
async function saveData(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;
    btn.innerText = 'กำลังบันทึก...';

    const currentMonthYear = "2026-09"; 

    const formData = {
        hosp_code: '10701',
        id_card: document.getElementById('idCard').value,
        fullname: document.getElementById('selectPatient').options[document.getElementById('selectPatient').selectedIndex].text,
        age: document.getElementById('age').value ? parseInt(document.getElementById('age').value) : null,
        house_no: document.getElementById('houseNo').value,
        village_no: document.getElementById('selectVillage').value ? parseInt(document.getElementById('selectVillage').value) : null,
        subdistrict: '',
        weight: document.getElementById('weight').value ? parseFloat(document.getElementById('weight').value) : null,
        height: document.getElementById('height').value ? parseFloat(document.getElementById('height').value) : null,
        bp1: document.getElementById('bp1').value,
        bp2: document.getElementById('bp2').value,
        pulse: document.getElementById('pulse').value ? parseInt(document.getElementById('pulse').value) : null,
        fbs: document.getElementById('fbs').value,
        smoking: document.getElementById('smoking').value,
        drinking: document.getElementById('drinking').value,
        next_appointment_date: document.getElementById('nextAppointmentDate').value || null,
        month_year: currentMonthYear
    };

    const { error } = await supabaseClient.from('health_records').insert([formData]);

    btn.disabled = false;
    btn.innerText = '💾 บันทึกข้อมูลเข้า Cloud';

    if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
        alert('บันทึกข้อมูลสำเร็จ!');
        document.getElementById('healthForm').reset();
        clearAutoFillFields();
        document.getElementById('selectPatient').disabled = true;
    }
}

// ----------------------------------------------------
// ฟังก์ชันจัดการฝั่งพยาบาล
// ----------------------------------------------------
function checkNurseAccessOnLoad() {
    const passwordInput = prompt("🔒 กรุณากรอกรหัสผ่านเข้าโซนพยาบาล:");
    if (passwordInput === NURSE_PASSWORD) {
        alert("เข้าสู่ระบบโซนพยาบาลสำเร็จ!");
        loadData();
    } else {
        alert("❌ รหัสผ่านไม่ถูกต้อง! กำลังพากลับหน้าหลัก");
        window.location.href = "asom.html";
    }
}

function lockNurseSession() {
    alert("ออกจากระบบเรียบร้อย");
    window.location.href = "asom.html";
}

function getExcelVal(row, keys, defaultValue = '') {
    for (let k of keys) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
            return row[k];
        }
    }
    return defaultValue;
}

// นำเข้าข้อมูลจากไฟล์ Excel
function importExcelData() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];

    if (!file) {
        alert("กรุณาเลือกไฟล์ Excel ก่อนกดอัปโหลด!");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonRows = XLSX.utils.sheet_to_json(worksheet);

            if (jsonRows.length === 0) {
                alert("ไม่พบข้อมูลในไฟล์ Excel นี้");
                return;
            }

            if (!confirm(`พบข้อมูล ${jsonRows.length} รายการ ต้องการนำเข้าสู่ Cloud ใช่หรือไม่?`)) {
                return;
            }

            let selectedMonthYear = document.getElementById('selectMonth') ? document.getElementById('selectMonth').value : "2026-09";

            const formattedRows = jsonRows.map(row => {
                let fname = String(getExcelVal(row, ['ชื่อ-นามสกุล', 'fullname', 'ชื่อนามสกุล', 'ชื่อ - นามสกุล', 'ชื่อ', 'Firstname'])).trim();
                let lname = String(getExcelVal(row, ['นามสกุล', 'Lastname'])).trim();
                let fullNameCombined = lname ? `${fname} ${lname}` : fname;

                let rawVillage = getExcelVal(row, ['หมู่', 'หมู่ที่', 'village_no']);
                let villageNumber = rawVillage ? parseInt(String(rawVillage).replace(/[^0-9]/g, '')) : null;

                return {
                    hosp_code: String(getExcelVal(row, ['hosp_code', 'รหัสสถานบริการ'], '10701')),
                    id_card: String(getExcelVal(row, ['id_card', 'PID', 'เลขบัตรประชาชน'], '')),
                    fullname: fullNameCombined,
                    age: getExcelVal(row, ['age', 'อายุ']) ? parseInt(getExcelVal(row, ['age', 'อายุ'])) : null,
                    house_no: String(getExcelVal(row, ['house_no', 'บ้านเลขที่'], '')),
                    village_no: villageNumber,
                    subdistrict: String(getExcelVal(row, ['subdistrict', 'ตำบล'], '')),
                    weight: getExcelVal(row, ['weight', 'น้ำหนัก']) ? parseFloat(getExcelVal(row, ['weight', 'น้ำหนัก'])) : null,
                    height: getExcelVal(row, ['height', 'ส่วนสูง']) ? parseFloat(getExcelVal(row, ['height', 'ส่วนสูง'])) : null,
                    bp1: String(getExcelVal(row, ['bp1', 'BP1'], '')),
                    bp2: String(getExcelVal(row, ['bp2', 'BP2'], '')),
                    pulse: getExcelVal(row, ['pulse', 'ชีพจร']) ? parseInt(getExcelVal(row, ['pulse', 'ชีพจร'])) : null,
                    fbs: String(getExcelVal(row, ['fbs', 'FBS'], '')),
                    smoking: String(getExcelVal(row, ['smoking', 'สูบบุหรี่'], 'ไม่สูบ')),
                    drinking: String(getExcelVal(row, ['drinking', 'ดื่มสุรา'], 'ไม่ดื่ม')),
                    diseases: String(getExcelVal(row, ['โรคประจำตัว', 'diseases'], '')),
                    next_appointment_date: getExcelVal(row, ['next_appointment_date', 'วันนัด', 'วันที่นัด']) || null,
                    doctor_visit: String(getExcelVal(row, ['doctor_visit', 'การพบแพทย์'], '')),
                    doctor_note: String(getExcelVal(row, ['doctor_note', 'คำสั่งแพทย์', 'หมายเหตุ'], '')),
                    month_year: selectedMonthYear
                };
            });

            const { error } = await supabaseClient.from('health_records').insert(formattedRows);

            if (error) {
                alert('นำเข้าไม่สำเร็จ: ' + error.message);
            } else {
                alert('🎉 นำเข้าข้อมูลประจำเดือนจาก Excel สำเร็จเรียบร้อย!');
                fileInput.value = '';
                loadData();
            }

        } catch (err) {
            alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// โหลดข้อมูลแสดงในตารางพยาบาล
async function loadData() {
    const selectMonthEl = document.getElementById('selectMonth');
    const currentMonth = selectMonthEl ? selectMonthEl.value : '2026-09';
    const tbody = document.getElementById('dataTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="16" class="text-center py-6 text-slate-400">กำลังดึงข้อมูล...</td></tr>`;

    const { data, error } = await supabaseClient
        .from('health_records')
        .select('*')
        .eq('month_year', currentMonth)
        .order('id', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="16" class="text-center py-6 text-red-500">เกิดข้อผิดพลาด: ${error.message}</td></tr>`;
        return;
    }

    globalRecords = data || [];
    
    const countTextEl = document.getElementById('recordCountText');
    if (countTextEl) {
        countTextEl.innerText = `แสดงข้อมูลประจำเดือน ${currentMonth} ทั้งหมด ${globalRecords.length} รายการ`;
    }

    if (globalRecords.length === 0) {
        tbody.innerHTML = `<tr><td colspan="16" class="text-center py-6 text-slate-400">ยังไม่มีข้อมูลในระบบสำหรับเดือนนี้</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    globalRecords.forEach((item, index) => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-3 font-medium">${index + 1}</td>
                <td class="p-3">${item.id_card || '-'}</td>
                <td class="p-3 font-semibold text-slate-800">${item.fullname || '-'}</td>
                <td class="p-3">${item.age || '-'}</td>
                <td class="p-3">ม.${item.village_no || '-'} บ้านเลขที่ ${item.house_no || '-'}</td>
                <td class="p-3">${item.weight || '-'}กก. / ${item.height || '-'}ซม.</td>
                <td class="p-3 font-medium text-slate-700">${item.bp1 || '-'}</td>
                <td class="p-3 font-medium text-slate-700">${item.bp2 || '-'}</td>
                <td class="p-3">${item.pulse || '-'}</td>
                <td class="p-3">${item.fbs || '-'}</td>
                <td class="p-3 text-blue-600 font-medium">${item.next_appointment_date || '-'}</td>
                <td class="p-3 text-slate-600">${item.doctor_note || '-'}</td>
                <td class="p-3 text-slate-700">${item.underlying_diseases || item.diseases || '-'}</td>
                <td class="p-3 text-center">${item.appoint_status || '-'}</td>
                <td class="p-3 text-center">
                    ${item.see_doctor || '-'}
                    ${item.doctor_reason ? `<br><span class="text-xs text-slate-500">(${item.doctor_reason})</span>` : ''}
                </td>
                <td class="p-3 text-center">
                    <button onclick="openEditModal(${item.id})" class="text-yellow-600 hover:text-yellow-800 text-xs bg-yellow-50 px-2.5 py-1.5 rounded-lg transition">แก้ไข</button>
                    <button onclick="deleteRecord(${item.id})" class="text-red-500 hover:text-red-700 text-xs bg-red-50 px-2.5 py-1.5 rounded-lg transition ml-1">ลบ</button>
                </td>
            </tr>
        `;
    });
}

async function deleteRecord(id) {
    if (confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) {
        const { error } = await supabaseClient.from('health_records').delete().eq('id', id);
        if (error) {
            alert('ลบไม่สำเร็จ: ' + error.message);
        } else {
            loadData();
        }
    }
}
// ฟังก์ชันสำหรับลบข้อมูลเมื่อคลิกปุ่มลบที่หน้าเว็บ
async function deleteRecord(id) {
    if (!confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) return;

    // ส่งคำสั่งลบไปยังตาราง health_records ใน Supabase โดยอ้างอิงจาก id
    const { error } = await supabase
        .from('health_records')
        .delete()
        .eq('id', id); // ลบแถวที่คอลัมน์ id ตรงกับที่ส่งมา

    if (error) {
        console.error('Error deleting data: ', error);
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    } else {
        alert('ลบข้อมูลเรียบร้อยแล้ว');
        
        // เรียกฟังก์ชันสำหรับโหลดข้อมูลในตารางหน้าเว็บใหม่ เพื่อให้ข้อมูลที่ถูกลบหายไปจากจอทันที
        loadTableData(); 
    }
}

// Modal แก้ไขข้อมูล
function openEditModal(id) {
    const record = globalRecords.find(r => r.id === id);
    if (!record) return;

    document.getElementById('editRecordId').value = record.id;
    document.getElementById('editFullname').value = record.fullname || '';
    document.getElementById('editIdCard').value = record.id_card || '';
    document.getElementById('editAge').value = record.age || '';
    document.getElementById('editWeight').value = record.weight || '';
    document.getElementById('editHeight').value = record.height || '';
    document.getElementById('editPulse').value = record.pulse || '';
    document.getElementById('editBp1').value = record.bp1 || '';
    document.getElementById('editBp2').value = record.bp2 || '';
    document.getElementById('editFbs').value = record.fbs || '';
    document.getElementById('editDoctorNote').value = record.doctor_note || '';

    const savedDiseases = (record.underlying_diseases || record.diseases) ? (record.underlying_diseases || record.diseases).split(',').map(d => d.trim()) : [];
    const standardValues = ["DM", "HT", "CKD", "Asthma", "COPD", "Stroke", "DLD", "Thyroid"];
    const otherDiseasesList = [];

    document.querySelectorAll('input[name="editDisease"]').forEach(cb => {
        cb.checked = savedDiseases.includes(cb.value);
    });

    savedDiseases.forEach(d => {
        if (!standardValues.includes(d) && d !== "") {
            otherDiseasesList.push(d);
        }
    });
    document.getElementById('editOtherDisease').value = otherDiseasesList.join(', ');

    document.querySelectorAll('input[name="editAppointStatus"]').forEach(radio => {
        radio.checked = (radio.value === record.appoint_status);
    });

    const seeDoctorRadios = document.querySelectorAll('input[name="editSeeDoctor"]');
    if (record.see_doctor === 'พบแพทย์') {
        seeDoctorRadios[0].checked = true;
        toggleDoctorReason(true);
        document.getElementById('editDoctorReason').value = record.doctor_reason || '';
    } else if (record.see_doctor === 'ไม่พบแพทย์') {
        seeDoctorRadios[1].checked = true;
        toggleDoctorReason(false);
        document.getElementById('editDoctorReason').value = '';
    } else {
        seeDoctorRadios.forEach(r => r.checked = false);
        toggleDoctorReason(false);
    }

    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}

function toggleDoctorReason(show) {
    const container = document.getElementById('editDoctorReasonContainer');
    if (container) {
        if (show) container.classList.remove('hidden');
        else container.classList.add('hidden');
    }
}

async function saveEditedRecord() {
    const id = document.getElementById('editRecordId').value;
    const selectedDiseases = [];
    document.querySelectorAll('input[name="editDisease"]:checked').forEach(cb => {
        selectedDiseases.push(cb.value);
    });

    const otherText = document.getElementById('editOtherDisease').value.trim();
    if (otherText) {
        otherText.split(',').map(item => item.trim()).filter(item => item !== "").forEach(o => {
            if (!selectedDiseases.includes(o)) selectedDiseases.push(o);
        });
    }

    const appointStatus = document.querySelector('input[name="editAppointStatus"]:checked')?.value || null;
    const seeDoctor = document.querySelector('input[name="editSeeDoctor"]:checked')?.value || null;
    const doctorReason = seeDoctor === 'พบแพทย์' ? document.getElementById('editDoctorReason').value : null;

    const updatedData = {
        age: document.getElementById('editAge').value ? parseInt(document.getElementById('editAge').value) : null,
        weight: document.getElementById('editWeight').value ? parseFloat(document.getElementById('editWeight').value) : null,
        height: document.getElementById('editHeight').value ? parseFloat(document.getElementById('editHeight').value) : null,
        pulse: document.getElementById('editPulse').value ? parseInt(document.getElementById('editPulse').value) : null,
        bp1: document.getElementById('editBp1').value,
        bp2: document.getElementById('editBp2').value,
        fbs: document.getElementById('editFbs').value,
        doctor_note: document.getElementById('editDoctorNote').value,
        underlying_diseases: selectedDiseases.join(', '),
        appoint_status: appointStatus,                 
        see_doctor: seeDoctor,                         
        doctor_reason: doctorReason                    
    };

    const { error } = await supabaseClient.from('health_records').update(updatedData).eq('id', id);

    if (error) {
        alert('บันทึกไม่สำเร็จ: ' + error.message);
    } else {
        alert('✅ บันทึกข้อมูลเรียบร้อยแล้ว');
        closeEditModal(); 
        loadData();       
    }
}

// ส่งออก CSV
function exportToCSV() {
    if (globalRecords.length === 0) {
        alert('ไม่มีข้อมูลสำหรับส่งออก');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
        ["ลำดับ,PID,ชื่อ-นามสกุล,อายุ,บ้านเลขที่,หมู่ที่,ตำบล,น้ำหนัก,ส่วนสูง,BP1,BP2,Pulse,FBS,สูบบุหรี่,ดื่มสุรา,โรคประจำตัว,วันนัด,สถานะนัดหมาย,การพบแพทย์,เหตุผลพบแพทย์,คำสั่งแพทย์"].join(",") + "\n";
    
    globalRecords.forEach((r, index) => {
        let row = [
            index + 1, 
            r.id_card, 
            `"${r.fullname || ''}"`, 
            r.age || '', 
            `"${r.house_no || ''}"`, 
            r.village_no || '', 
            `"${r.subdistrict || ''}"`, 
            r.weight || '', 
            r.height || '', 
            `"${r.bp1 || ''}"`, 
            `"${r.bp2 || ''}"`, 
            r.pulse || '', 
            `"${r.fbs || ''}"`, 
            `"${r.smoking || ''}"`, 
            `"${r.drinking || ''}"`, 
            `"${r.underlying_diseases || r.diseases || ''}"`, 
            r.next_appointment_date || '', 
            `"${r.appoint_status || ''}"`,       
            `"${r.see_doctor || ''}"`,           
            `"${r.doctor_reason || ''}"`,        
            `"${r.doctor_note || ''}"`           
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "health_records_monthly.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ลบข้อมูลทั้งเดือน
async function deleteEntireMonth() {
    const selectMonthEl = document.getElementById('selectMonth');
    const currentMonth = selectMonthEl ? selectMonthEl.value : '2026-09';

    if (!confirm(`⚠️ คำเตือน: คุณต้องการลบข้อมูล "ทั้งหมด" ของเดือน ${currentMonth} ออกจากระบบใช่หรือไม่?`)) {
        return;
    }

    // เพิ่ม { count: 'exact' } เพื่อเช็คว่าลบไปกี่แถว
    const { error, count } = await supabaseClient
        .from('health_records')
        .delete({ count: 'exact' })
        .eq('month_year', currentMonth);

    if (error) {
        alert('ลบข้อมูลทั้งเดือนไม่สำเร็จ: ' + error.message);
    } else {
        alert(`🎉 ลบข้อมูลของเดือน ${currentMonth} เรียบร้อยแล้ว (ลบไปทั้งหมด ${count || 0} รายการ)`);
        loadData(); 
    }
}