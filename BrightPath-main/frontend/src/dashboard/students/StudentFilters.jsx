export function StudentFilters({
  classes = [],
  filters,
  onChange,
  onReset,
}) {
  function update(key, value) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  return (
    <section className="students-filters" aria-label="Student filters">
      <label className="students-search">
        <span>بحث</span>
        <input
          type="search"
          placeholder="الاسم أو كود الطالب"
          value={filters.search}
          onChange={event => update('search', event.target.value)}
        />
      </label>

      <label>
        <span>الفصل</span>
        <select value={filters.classId} onChange={event => update('classId', event.target.value)}>
          <option value="">كل الفصول</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.nameAr || cls.name || cls.nameEn || 'فصل'}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>النوع</span>
        <select value={filters.gender} onChange={event => update('gender', event.target.value)}>
          <option value="">الكل</option>
          <option value="male">ذكر</option>
          <option value="female">أنثى</option>
        </select>
      </label>

      <label>
        <span>الحالة</span>
        <select value={filters.isActive} onChange={event => update('isActive', event.target.value)}>
          <option value="">الكل</option>
          <option value="true">نشط</option>
          <option value="false">غير نشط</option>
        </select>
      </label>

      <button type="button" className="students-button students-button--ghost" onClick={onReset}>
        مسح الفلاتر
      </button>
    </section>
  );
}
