// app.js
document.addEventListener('DOMContentLoaded', () => {
    const groupSelect = document.getElementById('group-select');
    const guidanceText = document.getElementById('guidance-text');
    const subjectIndicator = document.getElementById('subject-indicator');
    const subjectName = document.getElementById('subject-name');
    const studentsSection = document.getElementById('students-section');
    const studentsList = document.getElementById('students-list');

    const gradeModal = document.getElementById('grade-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalStudentName = document.getElementById('modal-student-name');
    const modalLockState = document.getElementById('modal-lock-state');
    const modalRevealState = document.getElementById('modal-reveal-state');
    const lockTarget = document.getElementById('lock-target');

    const modalBadgeMsg = document.getElementById('modal-badge-msg');
    const modalGradeValue = document.getElementById('modal-grade-value');

    // ------------------------------------------------------------
    // CONFIGURACIÓN DE CONTRASEÑAS POR GRUPO
    // La clave debe coincidir EXACTAMENTE con el nombre de la hoja en tu Excel (1C, 2M, etc).
    // Si agregas un grupo nuevo en el Excel, agrega aquí su contraseña.
    // ------------------------------------------------------------
    const contrasenasPorGrupo = {
        "1C": "882847",
        "2C": "533247",
        "3C": "441052",
        "4C": "435827",
        "5C": "262689",

        "1M": "854517",
        "2M": "586834",
        "3M": "106920",
        "4M": "451657",
        "5M": "246969",
        "6M": "777736"
    };

    // ------------------------------------------------------------
    // MATERIA SEGÚN LA LETRA FINAL DEL NOMBRE DE GRUPO (1C -> C, 2M -> M, ...)
    // Agrega aquí más letras si usas otras materias.
    // ------------------------------------------------------------
    const materiaPorLetra = {
        "C": "CULTURA DIGITAL",
        "M": "MATEMÁTICAS"
    };

    function materiaDeGrupo(group) {
        const letra = group.slice(-1).toUpperCase();
        return materiaPorLetra[letra] || '';
    }

    function ordenNatural(a, b) {
        return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
    }

    // ------------------------------------------------------------
    // FUENTE DE DATOS: el profesor sincroniza este archivo desde Excel
    // usando sync.html. La app SIEMPRE lee la versión más reciente,
    // y los grupos disponibles se toman directamente de aquí (sin límite).
    // ------------------------------------------------------------
    const DATA_URL = 'data/calificaciones.json';

    let gradesData = null;
    let currentStudent = null;
    let pressTimer = null;
    let explosionTimeout = null;
    const holdDuration = 4000;

    async function loadGradesData() {
        if (gradesData) return gradesData;
        const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`No se pudo cargar ${DATA_URL} (status ${response.status})`);
        }
        gradesData = await response.json();
        return gradesData;
    }

    function populateGroupDropdown(data) {
        const groups = Object.keys(data).sort(ordenNatural);
        groups.forEach(group => {
            const opt = document.createElement('option');
            opt.value = group;
            opt.textContent = group;
            groupSelect.appendChild(opt);
        });
    }

    // Cargar datos y poblar el dropdown desde el primer momento
    (async () => {
        try {
            const data = await loadGradesData();
            populateGroupDropdown(data);
        } catch (err) {
            console.error(err);
            guidanceText.textContent = 'No se pudieron cargar los grupos. Intenta recargar la página.';
        }
    })();

    groupSelect.addEventListener('change', async (e) => {
        const group = e.target.value;
        if (!group) return;

        const contrasenaCorrecta = contrasenasPorGrupo[group];
        if (!contrasenaCorrecta) {
            alert('Este grupo todavía no tiene acceso configurado. Avísale al profesor.');
            e.target.value = "";
            return;
        }

        const inputContrasena = prompt(`Introduce la contraseña para el grupo ${group}:`);

        if (inputContrasena !== contrasenaCorrecta) {
            alert("Contraseña incorrecta. No tienes acceso a este grupo.");
            e.target.value = ""; // Resetea el dropdown a la opción por defecto "--"
            subjectIndicator.classList.add('hidden');
            studentsSection.classList.add('hidden');
            guidanceText.textContent = 'Elige tu grupo para ver tu calificación';
            return;
        }

        const subject = materiaDeGrupo(group);

        guidanceText.textContent = 'Cargando calificaciones...';
        if (subject) {
            subjectName.textContent = subject;
            subjectIndicator.classList.remove('hidden');
        } else {
            subjectIndicator.classList.add('hidden');
        }

        try {
            const data = await loadGradesData();
            const students = data[group] || [];
            guidanceText.textContent = 'Busca tu nombre para ver tu calificación';
            renderStudents(students);
        } catch (err) {
            console.error(err);
            guidanceText.textContent = 'No se pudieron cargar las calificaciones. Intenta de nuevo más tarde.';
            studentsSection.classList.add('hidden');
        }
    });

    function getColorClassText(grade) {
        if (grade <= 5.9) return 'text-red';
        if (grade >= 6.0 && grade <= 6.9) return 'text-orange';
        if (grade >= 7.0 && grade <= 7.9) return 'text-yellow';
        if (grade >= 8.0 && grade <= 8.9) return 'text-green';
        if (grade >= 9.0 && grade <= 9.9) return 'text-blue';
        if (grade >= 10.0) return 'text-gold-style';
        return '';
    }

    function getFeedbackMessage(grade) {
        if (grade >= 10.0) return 'FELICIDADES';
        if (grade >= 9.0 && grade <= 9.9) return 'MUY BIEN';
        if (grade >= 8.0 && grade <= 8.9) return 'BIEN';
        if (grade >= 7.0 && grade <= 7.9) return 'OK';
        if (grade >= 6.0 && grade <= 6.9) return 'POR POQUITO...';
        return 'HAY QUE ESFORZARSE MÁS';
    }

    function renderStudents(students) {
        studentsList.innerHTML = '';
        if (!students || students.length === 0) {
            studentsList.innerHTML = '<p style="text-align:center; font-weight:600; color:var(--text-muted);">No hay alumnos registrados.</p>';
            studentsSection.classList.remove('hidden');
            return;
        }

        students.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';

            card.innerHTML = `
                <div class="student-info-left">
                    <div class="student-name">${student.nombre}</div>
                </div>
            `;

            card.addEventListener('click', () => openModal(student));
            studentsList.appendChild(card);
        });

        studentsSection.classList.remove('hidden');
    }

    function openModal(student) {
        currentStudent = student;
        modalStudentName.textContent = student.nombre;

        modalLockState.classList.remove('hidden');
        modalRevealState.classList.add('hidden');
        lockTarget.className = 'lock-circle';

        gradeModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        gradeModal.classList.add('hidden');
        document.body.style.overflow = '';
        resetPress();
        if (explosionTimeout) {
            clearTimeout(explosionTimeout);
            explosionTimeout = null;
        }
    }

    closeModalBtn.addEventListener('click', closeModal);

    gradeModal.addEventListener('click', (e) => {
        if (e.target === gradeModal) closeModal();
    });

    function startPress(e) {
        e.preventDefault();
        if (lockTarget.classList.contains('spectacular-explosion')) return;

        lockTarget.classList.add('pressing');

        pressTimer = setTimeout(() => {
            triggerExplosion();
        }, holdDuration);
    }

    function resetPress() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
        if (!lockTarget.classList.contains('spectacular-explosion')) {
            lockTarget.classList.remove('pressing');
        }
    }

    lockTarget.addEventListener('mousedown', startPress);
    lockTarget.addEventListener('touchstart', startPress, { passive: false });

    lockTarget.addEventListener('mouseup', resetPress);
    lockTarget.addEventListener('mouseleave', resetPress);
    lockTarget.addEventListener('touchend', resetPress);

    function triggerExplosion() {
        pressTimer = null;
        lockTarget.className = 'lock-circle spectacular-explosion';

        explosionTimeout = setTimeout(() => {
            revealGrade();
        }, 600);
    }

    function revealGrade() {
        modalLockState.classList.add('hidden');

        const grade = currentStudent.calificacionFinal;
        const colorClass = getColorClassText(grade);

        modalBadgeMsg.textContent = getFeedbackMessage(grade);
        modalBadgeMsg.className = `modal-badge-msg ${grade >= 10.0 ? 'text-gold' : colorClass}`;

        modalGradeValue.textContent = grade.toFixed(1);
        modalGradeValue.className = `modal-grade-value ${colorClass}`;

        modalRevealState.classList.remove('hidden');
    }
});
