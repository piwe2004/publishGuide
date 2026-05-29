/**
 * @FileName    : grid.js
 * @Description : 테이블 생성 스크립트
 * @Author      : 김민규
 * @Created     : 2026-05-15
 * * 연혁 (History)
 * --------------------------------------------------
 * 날짜          작성자         내용
 * --------------------------------------------------
 * 2026-05-15    김민규         최초 생성
 */

/**
 * @fileoverview 바닐라 JS 기반의 데이터 그리드 엔진
 * @author 김민규/JMSoft
 * @version 1.0.0
 * @description
 * * JSON데이터를 받아와 그리드를 만드는 컴포넌트입니다.
 * * JSON데이터와 DOM을 동기화 하며, 셀데이터 변경 감지 이벤트를 지원합니다.
 */
class GridTable {
    /**
     * GridTable 인스턴스를 생성합니다.
     * * @param {string} targetId - 그리드가 렌더링될 부모 컨테이너 div의 id
     * @param {Object} options - 그리드 설정 옵션 객체
     * @param {Array<Object>} options.columns - 컬럼 정의 배열 (name, header, width, edit, color, background 속성 포함)
     * @param {Array<Object>} options.data - 그리드에 바인딩될 JSON 데이터 배열
     * @param {Function} [options_onRowChanged] - 데이터 변경시 호출될 콜백 함수. (event: {rowIndex, columnName, value, rowData}) 객체를 반환합니다.
     * * @example
     * const myGrid = new GridTable('grid', {
     * columns: [{name: 'id', header: '사번'}],
     * data: [{id: 'A001'}]
     * });
     * * @description
     * * options.columns의 header의 | 기준으로 rowspan, colspan은 작업합니다.
     */
    constructor(targetId, options = {}) {
        // 전달받은 targetId의 엘리먼트를 담는 객체
        this.container = document.getElementById(targetId);
        if (!this.container) throw new Error('요소 ' + targetId + '를 찾을 수 없습니다.');

        this.targetId = targetId; // checkbox, radio박스의 그룹화를 위해 고유 ID저장
        this.options = options || {}; // row의 옵션
        this.config = options.config || {}; // 테이블의 컴포넌트
        this.columns = options.columns || []; // 테이블의 컬럼들
        this.data = []; // 초기엔 무조건 배열로 시작

        // DOM 참조변수
        this.table = null;
        this.tbody = null;

        this._mapMethodsToGlobal();
        this.init();
    }

    /**
     * 그리드를 초기화 하고 최초 렌더링을 수행합니다.
     */
    init() {
        // this.data = JSON.parse(JSON.stringify(options.data || [])); // 참조 오류를 막기 위한 초기 데이터를 깊은 복사함

        // 테이블 태그 생성
        this.table = Object.assign(document.createElement('table'), {
            className: 'grid-table'
        });

        // col들의 크기를 담당하는 colgroup 만듭니다.
        const _colgroup = document.createElement('colgroup');
        this.columns.forEach(col => {
            const _colEl = document.createElement('col');
            const _colWidth = col.width;

            if (col.hidden) {
                _colEl.style.width = '0px';
            } else if (typeof _colWidth === 'number') {
                _colEl.style.width = `${_colWidth}px`;
            } else if (/^\d+$/.test(String(_colWidth || '').trim())) {
                _colEl.style.width = `${_colWidth}px`;
            } else if (_colWidth) {
                _colEl.style.width = _colWidth;
            } else {
                _colEl.style.width = 'auto';
            }
            _colgroup.appendChild(_colEl);
        });

        this.table.appendChild(_colgroup);

        // thead 생성 (rowspan, colspan) 여부 체크
        const _theadEl = document.createElement('thead');
        // 헤더정보 세팅
        const _parsedCols = this.columns.map(col => ({
            ...col,
            parts: (col.header || col.name).split('|') // col의 header에서 | 기준으로 자르기
        }));
        const _maxDepth = _parsedCols.length > 0
            ? Math.max(..._parsedCols.map(c => c.parts.length))
            : 0;
 
        /**
         * 각 depth(r)에서 컬럼별 "그룹 루트 인덱스"를 미리 계산합니다.
         *
         * 같은 텍스트라도 비연속이거나 상위 depth에서 이미 다른 그룹에
         * 속해 있으면 별개 그룹으로 분리합니다.
         *
         * groupRootMap[r][c] = depth r 에서 c번 컬럼이 속한 그룹의
         *                      시작 컬럼 인덱스 (그룹 식별자)
         */
        const groupRootMap = [];
        for (let r = 0; r < _maxDepth; r++) {
            const roots = [];
            for (let c = 0; c < _parsedCols.length; c++) {
                if (c === 0) {
                    roots[c] = 0;
                    continue;
                }
 
                const curText  = _parsedCols[c].parts.slice(0, r + 1).join('|');
                const prevText = _parsedCols[c - 1].parts.slice(0, r + 1).join('|');
 
                // 조건 1: | 로 구분된 다중 헤더 컬럼이어야 한다.
                //          | 가 없으면 단독 셀이므로 병합 대상에서 제외한다.
                const hasPipe = _parsedCols[c].parts.length > 1;
 
                // 조건 2: 현재 depth의 텍스트 경로가 바로 앞 컬럼과 같아야 한다.
                const sameText = (curText === prevText);
 
                // 조건 3: 현재 depth가 해당 컬럼의 parts 범위 안이어야 한다.
                //          r >= parts.length 이면 rowspan 으로 채워지는 구간이므로
                //          colspan 병합 대상이 아니다.
                const withinDepth = (r < _parsedCols[c].parts.length);
 
                if (hasPipe && sameText && withinDepth) {
                    roots[c] = roots[c - 1]; // 같은 그룹 → 앞 컬럼의 루트 인덱스를 이어받음
                } else {
                    roots[c] = c;            // 새 그룹 시작
                }
            }
            groupRootMap[r] = roots;
        }

        // 다중 헤더(colspan/rowspan) 처리시, 이미 병합되어 점유된 셀 좌표를 기록해 중복 생성을 막기 위한 변수
        const skipMap = {};

        for (let r = 0; r < _maxDepth; r++) {
            const _trEl = document.createElement('tr');
            for (let c = 0; c < _parsedCols.length; c++) {
                if (skipMap[`${r}_${c}`]) continue;

                const _col = _parsedCols[c];
                const _partText = _col.parts[r] || _col.parts[_col.parts.length - 1];

                let _colspan = 1;
                for (let nextC = c + 1; nextC < _parsedCols.length; nextC++) {
                    if (groupRootMap[r][nextC] === c) {
                        _colspan++;
                    } else {
                        break;
                    }
                }

                let _rowspan = 1;
                if (r === _col.parts.length - 1) { _rowspan = _maxDepth - r; }

                for (let rr = 0; rr < _rowspan; rr++) {
                    for (let cc = 0; cc < _colspan; cc++) {
                        if (rr === 0 && cc === 0) continue;
                        skipMap[`${r + rr}_${c + cc}`] = true;
                    }
                }

                const _thEl = Object.assign(document.createElement('th'), {
                    className: _col.hidden ? 'gt-hidden' : ''
                });

                if (_colspan > 1) _thEl.setAttribute('colspan', _colspan);
                if (_rowspan > 1) _thEl.setAttribute('rowspan', _rowspan);
                // 부모가 있는 th
                if (r > 0) _thEl.classList.add('gt-th-child');

                if (_col.type === 'checkbox' && r === _col.parts.length - 1) {
                    const _chkAll = Object.assign(document.createElement('input'), {
                        type: 'checkbox',
                        className: 'input-item__check'
                    });

                    _chkAll.dataset.headerCol = _col.name;

                    _chkAll.addEventListener('change', (e) => {
                        const _isChecked = _chkAll.checked;
                        this.data.forEach(row => row[_col.name] = _isChecked);
                        const _childChecks = this.tbody.querySelectorAll(`input.input-item__check[name="${_col.name}"]`);
                        _childChecks.forEach(cb => {
                            cb.checked = _isChecked;
                        });

                        this._triggerEvent('onRowChanged', -1, _col.name, _isChecked, this.data);
                    });

                    _thEl.appendChild(_chkAll);
                } else {
                    _thEl.textContent = _partText;
                }

                _trEl.appendChild(_thEl);
            }
            _theadEl.appendChild(_trEl);
        }
        this.table.appendChild(_theadEl);

        // 초기 tbody 룸 제작
        this.tbody = document.createElement('tbody');
        this.renderEmptyRow();
        this.table.appendChild(this.tbody);

        this.container.appendChild(this.table);
    }

    renderRows(gridData) {
        this.tbody.innerHTML = '';

        if (!gridData || gridData.length === 0) {
            this.data = [];
            this.renderEmptyRow();
            return;
        }

        // column에는 있지만 rowData에는 없는 키값은 null이나 undefined로 출력
        // row 데이터를 가져올때 해당 키는 빈값이 되는 오류가 있어서 작업
        this.data = gridData.map(row => {
            const orgRow = { ...row };

            this.columns.forEach(col => {
                if (col.name && !(col.name in orgRow)) {
                    if (col.type === "checkbox" || col.type === "switch") {
                        orgRow[col.name] = false;
                    } else {
                        orgRow[col.name] = null;
                    }
                }
            });
            return orgRow;
        });

        const _fragment = document.createDocumentFragment();

        this.data.forEach((rowData, rowIndex) => {
            const _trEl = this._makeRowElement(rowIndex);
            _fragment.appendChild(_trEl); // 메모리에 먼저 추가
            this._triggerEvent('onRenderRow', rowData, rowIndex);
        });

        this.tbody.appendChild(_fragment); // 최종 딱 한 번만 DOM에 반영

        // 화면 렌더링이 끝나면 체크박스 헤더 상태를 재계산
        this.columns.forEach(_col => {
            if (_col.type === 'checkbox') this._syncHeaderCheckbox(_col.name);
        });

        this._triggerEvent('onSearchEnd', this.data);
    }

    renderEmptyRow(message) {
        this.tbody.innerHTML = '';
        const _trEl = document.createElement('tr');
        const _tdEl = document.createElement('td');
        _tdEl.setAttribute("colspan", this.columns.length);

        lucide.createIcons({
            attrs: {
                width: 24,
                height: 24,
                'stroke-width': 2
            }
        });

        const _emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="triangle-alert" aria-hidden="true" class="lucide lucide-triangle-alert text-error-02"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`;
        const _emptyText = `
            <div class="d-flex align-center justify-center flex-column gap-20">
                ${_emptySvg}
                <p class="text-gray-05">${message || '검색결과가 존재하지 않습니다.<br/>재검색 해주세요.'}</p>
            </div>`;

        _tdEl.innerHTML = _emptyText;

        _tdEl.style.cssText = 'height:376px';
        _trEl.appendChild(_tdEl);
        this.tbody.appendChild(_trEl);
    }

    // row의 데이터가 변경이 된 경우 무슨 데이터가 변경 되었는지 확인하는 함수
    onRowChanged(rowIdx, colName, newValue, rowData) {}
    // cell클릭
    onCellClick(rowIdx, colName, value, rowData) {}
    // 서버에서 데이터를 받은 후 테이블에 그리기전 row 별로 데이터 값의 변경이나 value의 변경 이벤트
    onBeforeRenderRow(row, rowIdx) {}
    // 데이터 로드 후 테이블에 그려질때 로우단위로 폰트색상, 배경컬러등을 변경할나 값을 비교 이벤트
    onRenderRow(row, rowIdx) {}

    // 테이블의 특정 row행 데이터 보기
    getRowValue(rowIdx) {
        return this.data[rowIdx] ? this.data[rowIdx] : null;
    }

    // rowData 개수
    getRowCount() {
        return this.data.length;
    }

    // 체크된 row의 Index 리턴
    getCheckedRowIndex(colName) {
        return this.data
            .map((row, idx) => {
                return (row[colName] === true || row[colName] === 'Y' || row[colName] === 1) ? idx : -1;
            })
            .filter(idx => idx !== -1);
    }

    // 체크된 데이터 리턴
    getCheckedRows(colName) {
        return this.data.filter(row => row[colName] === true || row[colName] === 'Y' || row[colName] === 1);
    }

    // 테이블의 특정 cell 데이터 보기
    getCellValue(rowIdx, colName) {
        return this.data[rowIdx] ? this.data[rowIdx][colName] : null;
    }

    getJsonString() { return JSON.stringify(this.data); }
    getData() { return this.data; }

    setCellFontColor(rowIdx, col, color) {
        const _trEl = this.tbody.querySelector(`tr[data-row-idx="${rowIdx}"]`);
        if (!_trEl) return;

        const _tdEl = _trEl.querySelector(`td[data-col="${col}"]`);
        if (!_tdEl) return;

        _tdEl.style.color = `${color}`;
    }

    setCellBgColor(rowIdx, col, color) {
        const _trEl = this.tbody.querySelector(`tr[data-row-idx="${rowIdx}"]`);
        if (!_trEl) return;

        const _tdEl = _trEl.querySelector(`td[data-col="${col}"]`);
        if (!_tdEl) return;

        _tdEl.style.backgroundColor = `${color}`;
    }

    setRowBgColor(rowIdx, color) {
        this.tbody.querySelector(`tr[data-row-idx="${rowIdx}"]`).style.cssText = `background-color:${color}`;
    }

    setCellValue(rowIdx, colName, newValue) {
        if (!this.data[rowIdx]) return;

        // 변경이 필요한 행의 index에 colName의 값을 변경
        this.data[rowIdx][colName] = newValue;

        const _tdEl = this.tbody.querySelector(`tr[data-row-idx="${rowIdx}"] td[data-col="${colName}"]`);

        if (_tdEl) {
            const colType = this.columns.find(col => col.name === colName);

            if (colType.type === "switch") {
                const isTrue = (newValue === true || newValue === 'Y' || newValue === 1);
                const btn = _tdEl.querySelector(".switch-btn");
                if (btn) {
                    btn.value = isTrue;
                    btn.className = `switch-btn ${isTrue ? 'is-active' : ''}`;
                }
            } else if (colType.type === "html") {
                _tdEl.innerHTML = newValue;
            } else if (colType.type === "checkbox") {
                _tdEl.querySelector("input[type='checkbox']").checked = newValue;
                this._syncHeaderCheckbox(colName);
            } else if (colType.type === "string") {
                _tdEl.querySelector(".gt-string").textContent = newValue;
            }
        }

        this._triggerEvent('onRowChanged', rowIdx, colName, newValue, this.data[rowIdx]);
    }

    // onRowClick(rowData, rowIdx){}
    // 그리드를 새롭게 마운트 합니다.
    remount(newColumn) {
        // 그리드 초기화
        this._destroy();

        if (newColumn) {
            this.columns = newColumn;
        }

        this.init();
    }

    /**
     * 이벤트 통합 디스패처 (인스턴스 매핑 및 전역 함수 자동 매핑 지원)
     */
    _triggerEvent(eventName, ...args) {
        if (typeof this[eventName] === "function") {
            this[eventName](...args);
        }
        const globalFuncName = `${this.targetId}_${eventName}`;

        // ex) function gridId_onRowRender(){}
        if (typeof window[globalFuncName] === "function") {
            window[globalFuncName](...args);
        } else {
            // console.log(`${globalFuncName} 못 찾음, arg: ${args}`);
        }
    }

    _mapMethodsToGlobal() {
        // 클래스에 정의된 모든 함수를 찾아 [ID_함수명] 형태로 전역에 등록
        const proto = Object.getPrototypeOf(this);
        Object.getOwnPropertyNames(proto).forEach(method => {
            // 생성자가 아닌 함수들만 골라내서 window에 등록
            if (typeof this[method] === 'function' &&
                method !== 'constructor' &&
                !method.startsWith('_') &&
                !method.startsWith('on')
            ) {
                // .bind(this)를 해야 함수 내부에 this가 그리드 객체를 가르킵니다.
                window[`${this.targetId}_${method}`] = this[method].bind(this);
            }
        });
        window[this.targetId] = this;
    }

    _syncHeaderCheckbox(colName) {
        const headerChk = this.table.querySelector(`thead input[data-header-col="${colName}"]`);
        if (headerChk) {
            if (this.data.length === 0) {
                headerChk.checked = false;
                return;
            }

            // 데이터가 전부 true면 헤더 체크박스도 true, 하나라도 false면 false
            const allChecked = this.data.every(row => row[colName] === true || row[colName] === 'Y' || row[colName] === 1);
            headerChk.checked = allChecked;
        }
    }

    _getTdElement(rowIdx, colName) {
        const tr = this.tbody.children[rowIdx];
        if (!tr) return null;
        return tr.querySelector(`td[data-col="${colName}"]`);
    }

    _changeRowData(rowData, rowIdx) {
        const _oldTr = this.tbody.children[rowIdx];
        if (!_oldTr) return;

        const _newTr = this._makeRowElement(rowIdx);

        this.tbody.replaceChild(_newTr, _oldTr);
        this._triggerEvent('onRenderRow', rowData, rowIdx);
        // 화면 렌더링이 끝나면 체크박스 헤더 상태를 재계산
        this.columns.forEach(_col => {
            if (_col.type === 'checkbox') this._syncHeaderCheckbox(_col.name);
        });
    }

    // data를 테이블의 행별로 그리는 이벤트
    _makeRowElement(rowIdx) {
        const _row = this.data[rowIdx];
        const _trEl = document.createElement('tr');

        // row의 옵션에 selected가 있다로 tr의 cursor가 pointer로 변경
        if (this.config.selected) {
            _trEl.style.cursor = "pointer";
            _trEl.classList.add("row-select");
            // _trEl.addEventListener("click", (e)=>{
            //     this._triggerEvent('onRowClick', _row, rowIdx);
            // });
        }

        console.log(_trEl);

        _trEl.dataset.rowIdx = rowIdx;

        this._triggerEvent('onBeforeRenderRow', _row, rowIdx);

        this.columns.forEach((colItem) => {
            const _tdEl = document.createElement('td');
            _tdEl.dataset.col = colItem.name;
            const _defaultValue = colItem.default !== undefined ? colItem.default : '';
            const _value = _row[colItem.name] !== undefined ? _row[colItem.name] : _defaultValue;
            _row[colItem.name] = _value;
            let _innerValue = '';

            if (colItem.cursor) _tdEl.style.cursor = "pointer";

            _tdEl.addEventListener("click", (e) => {
                this._triggerEvent('onCellClick', rowIdx, colItem.name, _value, this.data[rowIdx]);
            });

            // 데이터 변경 이벤트 핸들러
            const handleChange = (e) => {
                let newValue = colItem.type === 'checkbox' ? e.target.checked : e.target.value;
                this.data[rowIdx][colItem.name] = newValue;
                this._triggerEvent('onRowChanged', rowIdx, colItem.name, newValue, this.data[rowIdx]);
            };

            // input의 타입이 지정되어 있지 않으면 text타입
            const cellType = colItem.type || 'string';

            if (cellType === 'select') {
                _innerValue = Object.assign(document.createElement("div"), { className: "input-box inp-item__select" });
                const _inputInner = _innerValue.appendChild(Object.assign(document.createElement("div"), { className: "input-box__inner" }));
                const _innerSelect = Object.assign(document.createElement('select'), { className: 'gt-select' });
                (colItem.options || []).forEach(opt => {
                    const optVal = opt.value;
                    const optionEl = Object.assign(document.createElement('option'), {
                        value: optVal,
                        textContent: opt.text || opt,
                        selected: _value === optVal
                    });
                    _innerSelect.appendChild(optionEl);
                });
                _inputInner.appendChild(_innerSelect);
                _innerSelect.addEventListener('change', handleChange);

            } else if (cellType === 'checkbox') {
                _innerValue = Object.assign(document.createElement('input'), {
                    type: 'checkbox',
                    className: 'input-item__check',
                    name: colItem.name,
                    checked: false
                });
                _innerValue.addEventListener('change', (e) => {
                    handleChange(e);
                    // 자식 체크박스 클릭시 헤더 체크박스 갱신
                    this._syncHeaderCheckbox(colItem.name);
                });

                _innerValue.checked = (_value === true || _value === 'Y' || _value === 1);
            } else if (cellType === 'switch') {
                const isTrue = (_value === true || _value === 'Y' || _value === 1);
                _innerValue = Object.assign(document.createElement('button'), {
                    type: 'button',
                    className: `switch-btn ${isTrue ? 'is-active' : ''}`,
                    value: isTrue
                });

                _innerValue.addEventListener('click', async () => {
                    const currentValue = this.data[rowIdx][colItem.name];
                    const isCurrentTrue = (currentValue === true || currentValue === 'Y' || currentValue === 1) ? false : true;

                    const targetValue = isCurrentTrue ? true : false;

                    if (typeof colItem.onToggle === 'function') {
                        const canSwitch = await colItem.onToggle(rowIdx, targetValue, this.data[rowIdx]);

                        if (canSwitch === false) {
                            return;
                        }
                    }

                    const newValue = targetValue;

                    this.data[rowIdx][colItem.name] = newValue;
                    _innerValue.value = newValue;
                    _innerValue.className = `switch-btn ${newValue ? 'is-active' : ''}`;

                    this._triggerEvent('onRowChanged', rowIdx, colItem.name, newValue, this.data[rowIdx]);
                });

            } else if (cellType === 'text') {
                _innerValue = Object.assign(document.createElement('input'), {
                    type: 'text',
                    className: 'gt-input',
                    value: _value
                });

                _innerValue.addEventListener('change', handleChange);
            } else if (cellType === 'html') {
                // _innerValue = document.createElement('div');
                _innerValue = _value || document.createElement("p");
            } else if (cellType === 'boolean') {
                const isTrue = (_value === true || _value === 'Y' || _value === 1);
                const booleanLabel = colItem.booleanLabel !== undefined && colItem.booleanLabel !== [] ? colItem.booleanLabel : ['사용', '미사용'];
                _innerValue = Object.assign(document.createElement('p'), {
                    className: 'gt-string',
                    textContent: isTrue ? booleanLabel[0] : booleanLabel[1]
                });
            } else {
                _innerValue = Object.assign(document.createElement('p'), {
                    className: 'gt-string',
                    textContent: _value || ''
                });
            }

            if (colItem.color) _tdEl.style.color = colItem.color;
            if (colItem.background) _tdEl.style.background = colItem.background;

            _tdEl.appendChild(_innerValue);
            if (colItem.hidden) {
                _tdEl.classList.add("gt-hidden");
            }
            _trEl.appendChild(_tdEl);
        });

        return _trEl;
    }

    _destroy() {
        const container = document.getElementById(this.targetId);
        if (container) container.innerHTML = '';

        this.data = [];
        this.table = null;
        this.thead = null;
        this.tbody = null;
        this.maxDepth = 0;
    }
}