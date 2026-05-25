import { useMemo, useState } from 'react';

const EMPTY_ITEM = { name: '', amountEgp: '' };
const EMPTY_INSTALLMENT = { dueDate: '', amountEgp: '' };

function sumItems(items = []) {
  return items.reduce((sum, item) => sum + (Number(item.amountEgp) || 0), 0);
}

function sumInstallments(rows = []) {
  return rows.reduce((sum, row) => sum + (Number(row.amountEgp) || 0), 0);
}

export function FeeStructureModal({
  academicYears = [],
  gradeLevels = [],
  mode = 'create',
  onClose,
  onSubmit,
  saving = false,
}) {
  const [nameAr, setNameAr] = useState('');
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id || '');
  const [gradeLevelId, setGradeLevelId] = useState(gradeLevels[0]?.id || '');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [installments, setInstallments] = useState([
    { ...EMPTY_INSTALLMENT },
    { ...EMPTY_INSTALLMENT },
    { ...EMPTY_INSTALLMENT },
  ]);
  const [error, setError] = useState('');

  const itemsTotal = useMemo(() => sumItems(items), [items]);
  const installmentsTotal = useMemo(() => sumInstallments(installments), [installments]);

  function updateItem(index, field, value) {
    setItems(current => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function updateInstallment(index, field, value) {
    setInstallments(current => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!nameAr.trim()) {
      setError('اسم هيكل المصروفات مطلوب');
      return;
    }
    if (!academicYearId) {
      setError('اختر العام الدراسي');
      return;
    }
    const validItems = items.filter(item => item.name?.trim() && Number(item.amountEgp) > 0);
    if (!validItems.length) {
      setError('أضف بند مصروفات واحد على الأقل');
      return;
    }
    const validInstallments = installments.filter(
      row => row.dueDate && Number(row.amountEgp) > 0
    );
    if (!validInstallments.length) {
      setError('حدد قسطًا واحدًا على الأقل');
      return;
    }
    if (Math.abs(itemsTotal - installmentsTotal) > 0.01) {
      setError('مجموع الأقساط يجب أن يساوي مجموع البنود');
      return;
    }

    onSubmit({
      nameAr: nameAr.trim(),
      nameEn: nameAr.trim(),
      academicYearId,
      gradeLevelId: gradeLevelId || null,
      items: validItems,
      installments: validInstallments,
      totalAmount: itemsTotal,
      mode,
    });
  }

  return (
    <div className="finance-modal-backdrop" role="presentation" onClick={onClose}>
      <form className="finance-modal" onClick={event => event.stopPropagation()} onSubmit={handleSubmit}>
        <h3>{mode === 'assign' ? 'تعيين هيكل المصروفات' : 'إنشاء هيكل مصروفات'}</h3>

        {mode !== 'assign' ? (
          <>
            <label>
              اسم الهيكل
              <input value={nameAr} onChange={event => setNameAr(event.target.value)} required />
            </label>
            <div className="finance-row-grid">
              <label>
                العام الدراسي
                <select value={academicYearId} onChange={event => setAcademicYearId(event.target.value)} required>
                  <option value="">اختر العام</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.id}>
                      {year.nameAr || year.nameEn || year.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                المرحلة / الصف
                <select value={gradeLevelId} onChange={event => setGradeLevelId(event.target.value)}>
                  <option value="">كل المراحل</option>
                  {gradeLevels.map(level => (
                    <option key={level.id} value={level.id}>
                      {level.nameAr || level.nameEn || level.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <section className="finance-modal__section">
              <div className="finance-modal__section-head">
                <strong>بنود المصروفات</strong>
                <button
                  type="button"
                  className="students-button students-button--ghost"
                  onClick={() => setItems(current => [...current, { ...EMPTY_ITEM }])}
                >
                  + بند
                </button>
              </div>
              {items.map((item, index) => (
                <div className="finance-row-grid" key={`item-${index}`}>
                  <label>
                    اسم البند
                    <input
                      value={item.name}
                      onChange={event => updateItem(index, 'name', event.target.value)}
                      placeholder="مثال: مصروفات دراسية"
                    />
                  </label>
                  <label>
                    المبلغ
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amountEgp}
                      onChange={event => updateItem(index, 'amountEgp', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="students-button students-button--ghost"
                    onClick={() => setItems(current => current.filter((_, i) => i !== index))}
                    disabled={items.length === 1}
                  >
                    حذف
                  </button>
                </div>
              ))}
              <div className="finance-total-line">
                <span>إجمالي البنود</span>
                <strong>{itemsTotal.toLocaleString('ar-EG')} ج.م</strong>
              </div>
            </section>
          </>
        ) : null}

        <section className="finance-modal__section">
          <div className="finance-modal__section-head">
            <strong>جدول الأقساط</strong>
            <button
              type="button"
              className="students-button students-button--ghost"
              onClick={() => setInstallments(current => [...current, { ...EMPTY_INSTALLMENT }])}
            >
              + قسط
            </button>
          </div>
          {installments.map((row, index) => (
            <div className="finance-row-grid" key={`inst-${index}`}>
              <label>
                تاريخ الاستحقاق
                <input
                  type="date"
                  value={row.dueDate}
                  onChange={event => updateInstallment(index, 'dueDate', event.target.value)}
                />
              </label>
              <label>
                مبلغ القسط
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.amountEgp}
                  onChange={event => updateInstallment(index, 'amountEgp', event.target.value)}
                />
              </label>
              <button
                type="button"
                className="students-button students-button--ghost"
                onClick={() => setInstallments(current => current.filter((_, i) => i !== index))}
                disabled={installments.length === 1}
              >
                حذف
              </button>
            </div>
          ))}
          <div className="finance-total-line">
            <span>مجموع الأقساط</span>
            <strong>{installmentsTotal.toLocaleString('ar-EG')} ج.م</strong>
          </div>
        </section>

        {error ? <p className="finance-form-error">{error}</p> : null}

        <div className="finance-modal__actions">
          <button type="button" className="students-button students-button--ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="students-button" disabled={saving}>
            {saving ? 'جاري الحفظ…' : mode === 'assign' ? 'تعيين' : 'حفظ الهيكل'}
          </button>
        </div>
      </form>
    </div>
  );
}
