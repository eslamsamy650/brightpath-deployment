export const roles = {

  teacher: {
    av: 'MF', avBg: 'rgba(96,165,250,0.25)', avC: '#93c5fd',
    name: 'Ms. Fatima Al-Rashid',
    role: 'Class Teacher · Grade 3A',
    roleBg: 'rgba(96,165,250,0.2)', roleC: '#93c5fd',
    nb: '3',
    greet: 'Good morning,',
    title: "Here's what's happening in your class today 👋",

    k1l: 'Students',      k1v: '28',   k1n: '↑ Full class today',  k1c: 'var(--green-500)',
    k2l: 'Pending Grades', k2v: '12',  k2n: '⚠ Need grading',      k2c: 'var(--amber-500)',
    k3l: 'Attendance',    k3v: '96%',  k3n: '↑ This week',         k3c: 'var(--green-500)',

    ni1: '📋 Assignments', nib1: '4',
    ni2: '📊 Gradebook',
    ni3: '✅ Attendance',
    nib2: '2',

    p1: '📋 Assignments',
    p1b: `
      <div class="row-item">
        <div class="row-av" style="background:var(--amber-100);color:var(--amber-700);">M</div>
        <div class="row-main"><div class="row-title">Math Worksheet — Chapter 5</div><div class="row-sub">Grade 3A · Due Tomorrow</div></div>
        <span class="chip chip-amber">14 / 28</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--blue-100);color:var(--blue-700);">E</div>
        <div class="row-main"><div class="row-title">English Reading Journal</div><div class="row-sub">Grade 3A · Due Mar 22</div></div>
        <span class="chip chip-green">28 / 28</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--purple-100);color:#7c22c4;">S</div>
        <div class="row-main"><div class="row-title">Science Drawing — Plants</div><div class="row-sub">Grade 3A · Due Mar 25</div></div>
        <span class="chip chip-blue">New</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--teal-100);color:#0f766e;">A</div>
        <div class="row-main"><div class="row-title">Art Project — My Family</div><div class="row-sub">Grade 3A · Due Apr 1</div></div>
        <span class="chip chip-teal">Draft</span>
      </div>`,

    p2: '⭐ Top Students',
    p2b: `
      <div class="row-item">
        <div class="row-av" style="background:rgba(240,165,0,0.12);color:#b45309;">YA</div>
        <div class="row-main"><div class="row-title">Yasmine Adel</div><div class="row-sub">Grade 3A</div></div>
        <span class="row-end" style="color:var(--green-500);">A+ · 97%</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--blue-100);color:var(--blue-700);">KH</div>
        <div class="row-main"><div class="row-title">Karim Hassan</div><div class="row-sub">Grade 3A</div></div>
        <span class="row-end" style="color:var(--green-500);">A · 93%</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--purple-100);color:#7c22c4;">LN</div>
        <div class="row-main"><div class="row-title">Lina Nour</div><div class="row-sub">Grade 3A</div></div>
        <span class="row-end" style="color:var(--blue-500);">B+ · 87%</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--green-100);color:var(--green-700);">OS</div>
        <div class="row-main"><div class="row-title">Omar Saleh</div><div class="row-sub">Grade 3A</div></div>
        <span class="row-end" style="color:var(--blue-500);">B · 82%</span>
      </div>`,
  },

  student: {
    av: 'YA', avBg: 'rgba(34,197,94,0.2)', avC: '#86efac',
    name: 'Yasmine Adel',
    role: 'Student · Grade 3A',
    roleBg: 'rgba(34,197,94,0.15)', roleC: '#86efac',
    nb: '2',
    greet: 'Hi Yasmine! 👋',
    title: "You're doing great — here's your day at a glance ⭐",

    k1l: 'My GPA',        k1v: 'A+',  k1n: 'Top of the class!',  k1c: 'var(--green-500)',
    k2l: 'Homework Due',  k2v: '2',   k2n: 'This week',           k2c: 'var(--amber-500)',
    k3l: 'Attendance',    k3v: '99%', k3n: 'Keep it up! 🌟',      k3c: 'var(--green-500)',

    ni1: '📚 My Homework', nib1: '2',
    ni2: '📊 My Grades',
    ni3: '📅 My Schedule',
    nib2: '1',

    p1: '📚 My Homework',
    p1b: `
      <div class="row-item">
        <div class="row-av" style="background:var(--amber-100);color:var(--amber-700);">M</div>
        <div class="row-main"><div class="row-title">Math Worksheet — Chapter 5</div><div class="row-sub">Due Tomorrow!</div></div>
        <span class="chip chip-amber">Due Soon</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--purple-100);color:#7c22c4;">S</div>
        <div class="row-main"><div class="row-title">Science Drawing — Plants</div><div class="row-sub">Due Mar 25</div></div>
        <span class="chip chip-blue">Not Started</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--blue-100);color:var(--blue-700);">E</div>
        <div class="row-main"><div class="row-title">English Reading Journal</div><div class="row-sub">Submitted!</div></div>
        <span class="chip chip-green">Done ✓</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--teal-100);color:#0f766e;">A</div>
        <div class="row-main"><div class="row-title">Art Project — My Family</div><div class="row-sub">Due Apr 1</div></div>
        <span class="chip chip-teal">In Progress</span>
      </div>`,

    p2: '📊 My Grades',
    p2b: `
      <div class="row-item">
        <div class="row-av" style="background:var(--blue-100);color:var(--blue-700);">M</div>
        <div class="row-main"><div class="row-title">Mathematics</div><div class="row-sub">Ms. Fatima</div></div>
        <span class="row-end" style="color:var(--green-500);">A+ · 97%</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--green-100);color:var(--green-700);">E</div>
        <div class="row-main"><div class="row-title">English</div><div class="row-sub">Mr. Samir</div></div>
        <span class="row-end" style="color:var(--green-500);">A · 92%</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--purple-100);color:#7c22c4;">A</div>
        <div class="row-main"><div class="row-title">Art</div><div class="row-sub">Ms. Rania</div></div>
        <span class="row-end" style="color:var(--green-500);">A · 95%</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--amber-100);color:var(--amber-700);">S</div>
        <div class="row-main"><div class="row-title">Science</div><div class="row-sub">Dr. Heba</div></div>
        <span class="row-end" style="color:var(--blue-500);">B+ · 88%</span>
      </div>`,
  },

  parent: {
    av: 'NA', avBg: 'rgba(249,115,22,0.2)', avC: '#fdba74',
    name: 'Mrs. Nadia Adel',
    role: "Parent · Yasmine's Mother",
    roleBg: 'rgba(249,115,22,0.15)', roleC: '#fdba74',
    nb: '2',
    greet: 'Good morning, Mrs. Adel 👋',
    title: "Here's a quick update on Yasmine today",

    k1l: "Yasmine's Average", k1v: 'A+',  k1n: 'Excellent this term!',        k1c: 'var(--green-500)',
    k2l: 'Attendance Rate',   k2v: '99%', k2n: 'Only 1 late this month',      k2c: 'var(--green-500)',
    k3l: 'New Messages',      k3v: '2',   k3n: 'From teachers',               k3c: 'var(--amber-500)',

    ni1: '📊 Progress Report', nib1: '',
    ni2: '✅ Attendance',
    ni3: '📬 Messages',
    nib2: '2',

    p1: '📬 Teacher Messages',
    p1b: `
      <div class="row-item">
        <div class="row-av" style="background:var(--blue-100);color:var(--blue-700);">MF</div>
        <div class="row-main"><div class="row-title">Ms. Fatima (Class Teacher)</div><div class="row-sub">"Yasmine scored 97% on Math this week!"</div></div>
        <span class="chip chip-green">New</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--green-100);color:var(--green-700);">DH</div>
        <div class="row-main"><div class="row-title">Dr. Heba (Science)</div><div class="row-sub">"Science project materials needed by Mar 25"</div></div>
        <span class="chip chip-amber">New</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--purple-100);color:#7c22c4;">RN</div>
        <div class="row-main"><div class="row-title">Ms. Rania (Art)</div><div class="row-sub">"Yasmine has real artistic talent!"</div></div>
        <span class="chip chip-blue">Read</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--amber-100);color:var(--amber-700);">SP</div>
        <div class="row-main"><div class="row-title">School Principal</div><div class="row-sub">"Spring term schedule now available"</div></div>
        <span class="chip chip-blue">Read</span>
      </div>`,

    p2: "📋 Yasmine's Activity",
    p2b: `
      <div class="row-item">
        <div class="row-av" style="background:var(--green-100);color:var(--green-700);">✓</div>
        <div class="row-main"><div class="row-title">English Journal submitted</div><div class="row-sub">On time · Today</div></div>
        <span class="row-end" style="color:var(--green-500);">Today</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--blue-100);color:var(--blue-700);">📊</div>
        <div class="row-main"><div class="row-title">Math grade posted: 97%</div><div class="row-sub">New grade from Ms. Fatima</div></div>
        <span class="row-end" style="color:var(--blue-500);">Yesterday</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--amber-100);color:var(--amber-700);">📅</div>
        <div class="row-main"><div class="row-title">Arrived late by 10 mins</div><div class="row-sub">Wednesday, Mar 12</div></div>
        <span class="row-end" style="color:var(--amber-500);">Mar 12</span>
      </div>
      <div class="row-item">
        <div class="row-av" style="background:var(--purple-100);color:#7c22c4;">🎨</div>
        <div class="row-main"><div class="row-title">Art project in progress</div><div class="row-sub">Due April 1st</div></div>
        <span class="row-end" style="color:var(--gray-400);">Apr 1</span>
      </div>`,
  },
};
