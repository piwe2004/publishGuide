/**
 * @Project     : 출입관리 시스템
 * @FileName    : common.js
 * @Description : 전역 공통 UI 컴포넌트 및 이벤트 제어 스크립트
 * @Author      : 김민규
 * @Created     : 2026-04-15
 * ----------------------------------------------------------------------------
 * 연혁 (History)
 * ----------------------------------------------------------------------------
 * 날짜         작성자          내용
 * ----------  ----------  ----------------------------------------------------
 * 2026-04-15  김민규       최초 생성
 */


const UI = {
    activePopupCount: 0,
    lastFocusedElement: null , // 팝업 닫힐 때 돌아갈 포커스 기억
    popup: {    // Popup
        open: function(id) {
            const el = document.getElementById(id);
            if (!el) return;
            
            // 현재 포커스 요소 저장
            UI.lastFocusedElement = document.activeElement;

            // popup가 open이 되었을떄
            el.classList.add('is-active');
            
            // 팝업의 부드럽게 올라오는 애니메이션 효과 클래스
            requestAnimationFrame(() => {
                 requestAnimationFrame(() => {
                    el.classList.add('is-visible'); 
                }); 
            });
            UI.activePopupCount++;
            document.body.classList.add('is-locked');
            
            
            if (el.dataset.dimClose === 'true' && !el.dataset.dimBound) {
                const dim = el.querySelector('.layer-dim');
                if (dim) {
                    dim.addEventListener('click', () => this.close(id));
                }
                el.dataset.dimBound = 'true';
            }
            // 접근성: 팝업 내부로 강제 포커스 이동
            const innerPopup = el.querySelector('.layer-sheet');
            if(innerPopup){
                innerPopup.setAttribute("tabIndex", "0");
                innerPopup.focus();
            } 
        },
        close: function(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.remove('is-visible');
            setTimeout(() => {
                el.classList.remove('is-active');
                UI.activePopupCount = Math.max(0, UI.activePopupCount - 1);
                if (UI.activePopupCount === 0 && !document.querySelector('.dialog-ui.is-active')) {
                    document.body.classList.remove('is-locked');
                }
                
                // 접근성: 팝업 닫힌 후 원래 버튼으로 포커스 복원
                if (UI.lastFocusedElement) {
                    UI.lastFocusedElement.focus();
                    UI.lastFocusedElement = null;
                }
            }, 300);
        }
    },

    dialog: { // Dialog
        _createDOM: function(type, message, id, confirmText = '확인', cancelText = '취소') {
            const dialogId = id ?? 'dialog_' + new Date().getTime();
            let buttonsHTML = type === 'alert' 
                ? `<button type="button" class="btn-confirm" id="${dialogId}_confirm">${confirmText}</button>`
                : `<button type="button" class="btn-cancel" id="${dialogId}_cancel">${cancelText}</button><button type="button" class="btn-confirm" id="${dialogId}_confirm">${confirmText}</button>`;
            
            // A11y: 커스텀 다이얼로그도 role="alertdialog" 추가
            const html = `
                <div id="${dialogId}" class="dialog-ui" role="alertdialog" aria-modal="true" aria-describedby="${dialogId}_desc">
                    <div class="dialog-dim" aria-hidden="true"></div>
                    <div class="dialog-inner" tabindex="-1">
                        <div class="dialog-body" id="${dialogId}_desc">${message}</div>
                        <div class="dialog-footer">${buttonsHTML}</div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            return document.getElementById(dialogId);
        },
        _showAndHandle: function(el, resolveFunc) {
            UI.lastFocusedElement = document.activeElement;
            
            el.classList.add('is-active'); document.body.classList.add('is-locked');
            
            const innerDialog = el.querySelector('.dialog-inner');
            if(innerDialog) innerDialog.focus();

            const cleanup = () => {
                el.classList.add('is-closing');
                setTimeout(() => { 
                    el.remove(); 
                    if (UI.activePopupCount === 0) document.body.classList.remove('is-locked'); 
                    if (UI.lastFocusedElement) { UI.lastFocusedElement.focus(); UI.lastFocusedElement = null; }
                }, 200);
            };
            const btnConfirm = el.querySelector('.btn-confirm');
            const btnCancel = el.querySelector('.btn-cancel');
            if (btnConfirm) btnConfirm.addEventListener('click', () => { cleanup(); resolveFunc(true); });
            if (btnCancel) btnCancel.addEventListener('click', () => { cleanup(); resolveFunc(false); });
        },
        alert: function(msg, id, confirmText) { 
            return new Promise((res) => { 
                this._showAndHandle(this._createDOM('alert', msg, id, confirmText), res); 
            }); 
        },
        confirm: function(msg, id, confirmText, cancelText) { 
            return new Promise((res) => {
                    this._showAndHandle(this._createDOM('confirm', msg, id, confirmText, cancelText), res); 
            }); 
        }
    },

    toast: { // Toast
        show: function(message, duration = 3000) {
            // A11y: aria-live 영역인 toast-field를 미리 만들어두고 업데이트해야 안정적
            let container = document.querySelector('.toast-field');
            if (!container) { 
                container = document.createElement('div'); 
                container.className = 'toast-field'; 
                // 토스트는 중요도에 따라 assertive(즉시) 또는 polite(기다림) 지정 가능
                container.setAttribute('aria-live', 'polite'); 
                document.body.appendChild(container); 
            }
            const el = document.createElement('div'); 
            el.className = 'toast-ui'; 
            el.setAttribute('role', 'status'); // 스크린리더에게 단순 상태 알림임을 보고
            el.innerHTML = message; 
            container.appendChild(el);
            
            setTimeout(() => {
                el.classList.add('is-closing');
                el.addEventListener('animationend', () => { 
                    el.remove(); 
                    if (container.childNodes.length === 0) container.remove();
                });
            }, duration);
        }
    },

    loading: { // Loading
        show: function(){
            const _loadingBox = document.createElement("div");
            _loadingBox.classList.add("loading-ui");
            _loadingBox.setAttribute('role', 'alert');
            _loadingBox.setAttribute('aria-busy', 'true');
            _loadingBox.setAttribute('aria-label', '화면 로딩 중입니다');
            _loadingBox.innerHTML = `<div class="loading-item" aria-hidden="true">IC</div>`;
            document.body.append(_loadingBox);
            
            // 애니메이션을 위해 강제 리플로우 후 클래스 추가
            requestAnimationFrame(() => { requestAnimationFrame(() => { _loadingBox.classList.add('is-active'); }); });
        },
        hide: function(){
            const loadingEl = document.querySelector(".loading-ui");
            if (loadingEl) {
                loadingEl.classList.remove('is-active');
                setTimeout(() => { loadingEl.remove(); }, 200); // fadeOut 대기 후 삭제
            }
        }        
    },

    select: function(id, option, callback){
        // bottom sheet의 select 속성을 가진 태그
        const _selectEl = document.querySelector(`[data-select-list="${id}"]`);
        if (!_selectEl) return; // 방어 코드
        const _selectField = document.querySelector(`[data-select-field="${id}"]`);
        const _valueEl = _selectField.querySelector("input.select-value");
        const _optionList = option;
        
        _optionList.forEach((opt, idx) =>{
            const _optionItem = Object.assign(document.createElement("li"), {
                className: "select-list__item",
            })
            _optionItem.setAttribute("role", "option");
            _optionItem.setAttribute("aria-selected", false);
            
            const _optionBtn = Object.assign(document.createElement("button"), {
                type: "button",
                className:"btn-item",
                innerText: opt.text,
            })
            _optionBtn.value = opt.value;
            _optionBtn.dataset.selectIdx = idx;
            
            _optionBtn.addEventListener("click", (e)=>{
                const _targetBtn = e.currentTarget;

                _selectEl.querySelectorAll("li").forEach(items => {
                    items.classList.remove("item-selected");
                    items.setAttribute("aria-selected", false);
                });

                _targetBtn.parentNode.setAttribute("aria-selected", true);
                _targetBtn.parentNode.classList.add("item-selected");
                _valueEl.value = _targetBtn.value;
                UI.popup.close(id);
            });
    
            _optionItem.append(_optionBtn);
            _selectEl.append(_optionItem);
        });

        _selectField.onclick = () =>{
            UI.popup.open(id);
        } 


    }
}

const layerSheet = (() => {
    // 내부 공통 유틸리티 (외부에서 접근 불가 - 캡슐화)
    const _getEl = (id) => document.querySelector(`[data-layerId="${id}"]`);

    return {
        /**
         * @method open
         * @param {String} id - 레이어 ID
         * @param {Object} options - 오픈 시 필요한 인자 (배경잠금, 타이머, 포커스 등)
         * @param {Function} callback - 오픈 후 실행
         */
        open: (id, {title, callback} = {}) => {
            const el = _getEl(id);
            const _layerField = document.querySelector(".layer-field");
            if (!el) return;
            if(!_layerField.classList.contains("layer-open")){
                document.body.style.overflow = 'hidden';
                _layerField.classList.add("layer-open");
            }
            
            el.classList.add('is-active');
            el.setAttribute('aria-hidden', 'false');
            
            const _closeBtn = el.querySelector(".layer-sheet__close");
            _closeBtn.addEventListener("click", ()=>{
                layerSheet.close(id);
            });

            if (typeof callback === 'function') callback(el);
        },
        /**
         * @method close
         * @param {String} id - 레이어 ID
         * @param {Object} result - 닫을 때 넘겨줄 데이터나 상태값
         * @param {Function} callback - 닫힌 후 실행
         */
        close: (id, result = {}, callback) => {
            const el = _getEl(id);
            if (!el) return;

            // 닫기 전용 공통 로직
            document.body.style.overflow = '';

            el.classList.remove('is-active');
            el.setAttribute('aria-hidden', 'true');
            
            // 닫을 때는 오픈 때와는 다른 '결과 데이터'를 콜백으로 전달
            if (typeof callback === 'function') callback(result);
        }
    };
})();



/**
 * @param {id} - (필수) Select의 ID
 * @param {layerId} - (필수) select를 넣을 layer ID
 * @param {title} - (선택) 바텀 시트의 타이틀
 * @param {callback} - (선택) 이벤트 처리 후 callback
 * @param {option} - (선택) 셀렉트 시트의 기타 옵션들
 * @description - Select 바텀 시트, select의 id값을 가져와 바텀시트에 들어갈 옵션을 만듬
 */
const selectSheet = (id, layerId, {title, callback, option={}} = {}) =>{

    
    if (!_selectId) return; // 방어 코드

    const _parentEl = _selectId.closest(".input-box.tp-select");
    if (!_parentEl) return;
    
    const selectOpen = () => {
        const _selectText = document.querySelector(`[data-select="${id}"]`);
        const _layerSheet = document.querySelector(`[data-layerId="${layerId}"]`);
        const _isSelect = _selectText.innerText === "" ? false : true;
        const _selectTitle = _selectId.parentNode.parentNode.querySelector(".input-box__label").innerText;
        const _optionList = _selectId.querySelectorAll("option");
        const _optionBox = document.createElement("ul");
    
        _optionBox.setAttribute("role", "listbox");
        _optionBox.setAttribute("aria-label", `${_selectTitle} 선택 항목`);
        
        _optionList.forEach((opt, idx) =>{
            if(opt.disabled) return;
            const _isSelected = _isSelect && opt.selected;
            const _optionItem = Object.assign(document.createElement("li"), {
                className: `select-item ${_isSelected ? 'is-selected' : ''}`,
            })
            _optionItem.setAttribute("role", "option");
            _optionItem.setAttribute("aria-selected", _isSelected);
            
            const _optionBtn = Object.assign(document.createElement("button"), {
                type: "button",
                innerText: opt.text,
            })
            _optionBtn.value = opt.value;
            _optionBtn.dataset.selectIdx = idx;
            
            _optionBtn.addEventListener("click", (e)=>{
                _optionList[idx].selected = true;
                _selectText.innerText = e.currentTarget.value;
                layerSheet.close(layerId);
                _layerSheet.querySelector(".content-area").innerHTML="";
            });
    
            _optionItem.append(_optionBtn);
            _optionBox.append(_optionItem);
        })
        _layerSheet.querySelector(".content-area").append(_optionBox);
    }
    
    _parentEl.onclick = () => {
        selectOpen();
        layerSheet.open(layerId);
    }

}
