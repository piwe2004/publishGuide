/**
 * @fileoverview IBSheet 스타일의 이벤트와 생명주기를 지원하는 경량 그리드 엔진
 */
class GridTable {
  constructor(targetId, options) {
    this.container = document.getElementById(targetId);
    if (!this.container) {
      console.error(`[Grid Error] '${targetId}' 요소를 찾을 수 없습니다.`);
      return;
    }

    this.targetId = targetId;
    this.options = options || {};
    this.columns = this.options.columns || [];
    this.data = [];

    this.table = null;
    this.tbody = null;

    // 명령어 전역 매핑 (grid_renderRows 등을 쓸 수 있게 함)
    this._mapMethodsToGlobal();
    
    // 뼈대 생성
    this.renderSkeleton();
  }

  // ==========================================
  // [1] 기본 이벤트 스텁 (에러 방지용 빈 함수)
  // ==========================================
  onRowChanged(rowIdx, colName, newValue, rowData) {}
  onCellClick(rowIdx, colName, event) {}
  onAction(rowIdx, colName, event) {}
  onBeforeRenderRow(row, rowIdx) {} // 데이터 로드 직후 가공용
  onRenderRow(rowIdx) {}            // 화면에 그려진 후 디자인용

  // ==========================================
  // [2] IBSheet 스타일 API
  // ==========================================
  GetCellValue(rowIdx, colName) {
    return this.data[rowIdx] ? this.data[rowIdx][colName] : null;
  }

  SetCellFontColor(rowIdx, colName, color) {
    const td = this._getTdElement(rowIdx, colName);
    if (td) td.style.color = color;
  }

  SetCellBackColor(rowIdx, colName, color) {
    const td = this._getTdElement(rowIdx, colName);
    if (td) td.style.backgroundColor = color;
  }

  _getTdElement(rowIdx, colName) {
    const tr = this.tbody.children[rowIdx];
    if (!tr) return null;
    return tr.querySelector(`td[data-col="${colName}"]`);
  }

  // ==========================================
  // [3] 엔진 핵심 유틸리티
  // ==========================================
  _triggerEvent(eventName, ...args) {
    // 1. 인스턴스 내부 스텁 실행
    if (typeof this[eventName] === 'function') {
      this[eventName](...args);
    }

    // 2. 사장님이 작성한 글로벌 함수 실행 (안전망 포함)
    const globalFuncName = `${this.targetId}_${eventName}`;
    if (typeof window[globalFuncName] === 'function') {
      window[globalFuncName](...args);
    } else {
      // (선택) 함수가 없을 때 어디서 멈췄는지 추적하고 싶다면 아래 주석을 푸세요
      // console.warn(`[Grid 알림] ${globalFuncName} 함수가 선언되지 않았습니다.`);
    }
  }

  _mapMethodsToGlobal() {
    const proto = Object.getPrototypeOf(this);
    Object.getOwnPropertyNames(proto).forEach(method => {
      if (typeof this[method] === 'function' && method !== 'constructor' && !method.startsWith('_')) {
        window[`${this.targetId}_${method}`] = this[method].bind(this);
      }
    });
    // 인스턴스 자체도 글로벌에 등록 (grid.renderRows() 사용 가능)
    window[this.targetId] = this;
  }

  _syncHeaderCheckbox(colName) {
    const headerChk = this.table.querySelector(`thead span.gt-chk[data-header-col="${colName}"]`);
    if (headerChk) {
      if (this.data.length === 0) {
        headerChk.classList.remove('on');
        return;
      }
      const allChecked = this.data.every(row => row[colName] === true || row[colName] === 'Y' || row[colName] === 1);
      headerChk.classList.toggle('on', allChecked);
    }
  }

  // ==========================================
  // [4] 화면 렌더링 영역
  // ==========================================
  renderSkeleton() {
    this.container.innerHTML = '';
    const wrapper = Object.assign(document.createElement('div'), { className: 'gt-container' });
    this.table = Object.assign(document.createElement('table'), { className: 'gt-table' });
    wrapper.appendChild(this.table);

    const colgroup = document.createElement('colgroup');
    this.columns.forEach(col => {
      const colEl = document.createElement('col');
      colEl.style.width = col.width || 'auto';
      colgroup.appendChild(colEl);
    });
    this.table.appendChild(colgroup);

    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    
    this.columns.forEach(col => {
      const th = document.createElement('th');
      if (col.type === 'checkbox') {
        const chkAll = Object.assign(document.createElement('span'), { className: 'gt-chk' });
        chkAll.dataset.headerCol = col.name;
        chkAll.addEventListener('click', () => {
          const isChecked = !chkAll.classList.contains('on');
          chkAll.classList.toggle('on', isChecked);
          this.data.forEach((row, idx) => {
            row[col.name] = isChecked;
            const cb = this.tbody.querySelector(`tr:nth-child(${idx + 1}) span.gt-chk[data-col="${col.name}"]`);
            if (cb) cb.classList.toggle('on', isChecked);
          });
          this._triggerEvent('onRowChanged', -1, col.name, isChecked, this.data);
        });
        th.appendChild(chkAll);
        if (col.header) th.appendChild(document.createTextNode(' ' + col.header));
      } else {
        th.textContent = col.header || col.name;
      }
      tr.appendChild(th);
    });
    
    thead.appendChild(tr);
    this.table.appendChild(thead);
    
    this.tbody = document.createElement('tbody');
    this.table.appendChild(this.tbody);
    
    this.renderEmptyRow('조회된 데이터가 없습니다.');
    this.container.appendChild(wrapper);
  }

  renderRows(newData) {
    // 1. 데이터 복사 (DOM 요소나 함수를 보존하기 위해 map 사용)
    this.data = newData.map(row => ({ ...row }));
    this.tbody.innerHTML = '';

    if (this.data.length === 0) {
      this.renderEmptyRow('조회된 결과가 없습니다.');
      return;
    }

    this.data.forEach((row, rowIndex) => {
      // ⭐ 시점 1: 그리기 직전에 데이터 가공 (버튼 삽입 등)
      this._triggerEvent('onBeforeRenderRow', row, rowIndex);

      const tr = document.createElement('tr');

      this.columns.forEach(col => {
        const td = document.createElement('td');
        td.dataset.col = col.name;
        
        const value = row[col.name] !== undefined ? row[col.name] : '';
        const type = col.type || 'text';
        let _innerValue = null;

        // --- 공통 이벤트 ---
        td.addEventListener('click', (e) => {
          if (['INPUT', 'SELECT', 'BUTTON', 'SPAN'].includes(e.target.tagName)) return;
          this._triggerEvent('onCellClick', rowIndex, col.name, e);
        });

        const commitChange = (newValue) => {
          this.data[rowIndex][col.name] = newValue;
          this._triggerEvent('onRowChanged', rowIndex, col.name, newValue, this.data[rowIndex]);
        };

        // --- 타입별 렌더링 ---
        if (type === 'html') {
          // 사장님 요청: 데이터에 DOM 요소(버튼)를 직접 넣었을 경우 통과시킴
          if (value instanceof HTMLElement) {
            _innerValue = value;
          } else {
            _innerValue = document.createElement('span');
            _innerValue.className = 'gt-html-wrapper';
            _innerValue.innerHTML = value;
          }
        } 
        else if (type === 'link' || type === 'button') {
          _innerValue = Object.assign(document.createElement('button'), {
            type: 'button',
            className: type === 'link' ? 'gt-btn-link' : 'gt-btn-common',
            textContent: col.linkText || value
          });
          _innerValue.addEventListener('click', (e) => {
            e.stopPropagation();
            this._triggerEvent('onAction', rowIndex, col.name, e);
          });
        } 
        else if (type === 'checkbox') {
          const isChecked = (value === true || value === 'Y' || value === 1);
          _innerValue = Object.assign(document.createElement('span'), { className: `gt-chk ${isChecked ? 'on' : ''}` });
          _innerValue.dataset.col = col.name;
          _innerValue.addEventListener('click', (e) => {
            e.stopPropagation();
            const next = !_innerValue.classList.contains('on');
            _innerValue.classList.toggle('on', next);
            commitChange(next);
            this._syncHeaderCheckbox(col.name);
          });
        } 
        else if (type === 'status') {
          td.className = 'gt-readonly';
          td.textContent = value;
        }
        else {
          if (!col.editable) {
            td.className = 'gt-readonly';
            td.textContent = value;
          } else {
            _innerValue = Object.assign(document.createElement('input'), { type: 'text', className: 'gt-input', value: value });
            _innerValue.addEventListener('change', (e) => commitChange(e.target.value));
          }
        }

        // 완성된 요소를 td에 넣기
        if (_innerValue) {
          td.appendChild(_innerValue);
        }
        tr.appendChild(td);
      });

      // 줄(tr)을 화면에 붙임
      this.tbody.appendChild(tr);

      // ⭐ 시점 2: 화면에 완전히 붙은 후 디자인 변경용 (SetCellFontColor 등)
      this._triggerEvent('onRenderRow', rowIndex);
    });

    // 헤더 체크박스 초기 동기화
    this.columns.forEach(col => { if (col.type === 'checkbox') this._syncHeaderCheckbox(col.name); });
  }

  renderEmptyRow(msg) {
    this.tbody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.appendChild(Object.assign(document.createElement('td'), { 
      colSpan: this.columns.length, 
      className: 'gt-empty', 
      textContent: msg 
    }));
    this.tbody.appendChild(tr);
  }

  // ==========================================
  // [5] 데이터 반환 API
  // ==========================================
  getJsonString() { return JSON.stringify(this.data); }
  getData() { return this.data; }
  getRowValue(rowIdx) { return this.data[rowIdx] || null; }
}