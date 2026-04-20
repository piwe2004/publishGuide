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
    lastFocusedElement: null, // 팝업 닫힐 때 돌아갈 포커스 기억
    // UI 공통 초기화 함수
    init: function() {
        this.bindEvents();
    },
    /**
     * @description 버튼과 팝업을 연결하고 라이프사이클(콜백)을 제어합니다.
     * 데이터 초기화, API 호출, 상태(confirm/cancel)에 따른 분기 등 비즈니스 로직이 필요한 경우 사용합니다.
     * * @param {string} btnSelector - 팝업을 열 트리거 버튼의 CSS 선택자 (예: '#btn-submit', '.btn-open')
     * @param {string} popupId - 열고자 하는 팝업의 고유 ID (예: 'bottom1')
     * @param {Object} [callbacks] - 팝업 라이프사이클 콜백 객체
     * @param {Function} [callbacks.open_callback] - 팝업이 열린 직후 실행될 함수
     * @param {Function} [callbacks.close_callback] - 팝업이 닫힌 후 실행될 함수. 
     * 매개변수 status('confirm' | 'cancel')를 통해 닫힌 이유를 구분 가능.
     * * @example
     * UI.popup.bind('#btn-show-terms', 'terms-popup', {
     *  open_callback: () => console.log('팝업 열림, 데이터 초기화'),
     *  close_callback: (status) => {
     *      if (status === 'cancel') console.log('X버튼이나 배경을 클릭해 닫힘 (취소)');
     *      if (status === 'confirm') console.log('내부에서 UI.popup.close(id, "confirm")을 호출해 닫힘 (완료)');
     *  }
     * });
     */
    bindEvents: function() {
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-layer-close], [data-layer-confirm], [data-layer-cancel]');
            if (closeBtn) {
                const parentPopup = closeBtn.closest('.layer-field');
                const targetId = parentPopup.dataset.layerId

                const _status = 'layerClose' in e.target.dataset 
                    ? "close" : 'layerCancel' in e.target.dataset 
                    ? "cancel" : "confirm";
                    
                this.popup.close(targetId, _status);
                // debugger;
            }
        });
    },
    popup: {    // Popup
        _hooks: {},
        open: function(id) {
            // Promise를 반환하도록 감싸기
            return new Promise((resolve) => {
                const el = document.querySelector(`[data-layer-id="${id}"]`);
                if (!el) return resolve(false); // 요소가 없으면 false 반환하며 종료
                
                // 현재 포커스 요소 저장
                UI.lastFocusedElement = document.activeElement;

                // popup이 open이 되었을 때
                el.classList.add('is-active');
                
                // 팝업의 부드럽게 올라오는 애니메이션 효과 클래스
                requestAnimationFrame(() => {
                     requestAnimationFrame(() => {
                        el.classList.add('is-visible'); 
                        resolve(true); // 애니메이션 클래스가 붙은 직후에 이벤트를 넘김
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
            });
        }
         /**
         * @description [명시적 이벤트 바인딩] 버튼과 팝업을 연결하고 라이프사이클을 제어합니다.
         * @param {string} popupId - layer 의 고유 ID
         * @param {Function} [callbacks.before_close] - 팝업이 닫히기 전에 실행이 되어야될 이벤트들
         * @param {Function} [callbacks.open_callback] - 팝업이 열릴 때 실행
         * @param {Function} [callbacks.confirm_callback] - '확인/완료' 로 닫힐 때 실행
         * @param {Function} [callbacks.cancel_callback] - 'X버튼/배경' 을 눌러 취소될 때 실행
         * @param {boolean} selectCheck - 셀렉트 기능이 있는 레이어팝업 여부 기본값 false
         */,
        close: async function(id, status = 'cancel') {
            const hook = this._hooks[id];

            // 확인(confirm) 상태로 닫으려 할 때, before_close가 있다면 실행
            if (hook && typeof hook.before_close === 'function') {
                // 사용자가 콜백 안에서 UI.dialog를 썼을 경우를 대비해 await로 기다림
                const canClose = await hook.before_close(status);
                
                // 만약 before_close에서 false를 반환했다면 창을 닫지 않고 여기서 중단
                if (canClose === false) {
                    return false; 
                }
            }

            // 검사를 무사히 통과했다면 기존처럼 팝업 닫기
            return new Promise((resolve) => {
                const el = document.querySelector(`[data-layer-id="${id}"]`);
                if (!el) return resolve(false);
                
                el.classList.remove('is-visible');
                setTimeout(() => {
                    el.classList.remove('is-active');
                    UI.activePopupCount = Math.max(0, UI.activePopupCount - 1);
                    if (UI.activePopupCount === 0 && !document.querySelector('.dialog-ui.is-active')) {
                        document.body.classList.remove('is-locked');
                    }
                    
                    if (UI.lastFocusedElement) {
                        UI.lastFocusedElement.focus();
                        UI.lastFocusedElement = null;
                    }
                    
                    // 닫힌 후 상태를 보고 close_callback이 실행됨
                    el.dispatchEvent(new CustomEvent('popup-closed', { detail: { id, status } }));
                    resolve(true);
                }, 300);
            });
        },
        /**
         * @description 이벤트 바인딩, 버튼과 팝업을 연결하고 라이프사이클을 제어합니다.
         * @param {string} popupId - layer 의 고유 ID
         * @param {Function} [callbacks.before_close] - 팝업이 닫히기 전에 실행이 되어야될 이벤트들
         * @param {Function} [callbacks.open_callback] - 팝업이 열릴 때 실행
         * @param {Function} [callbacks.confirm_callback] - '확인/완료' 로 닫힐 때 실행
         * @param {Function} [callbacks.cancel_callback] - 'X버튼/배경' 을 눌러 취소될 때 실행
         * @param {boolean} selectCheck - 셀렉트 기능이 있는 레이어팝업 여부 기본값 false
         */
        bind: function(popupId, { before_close, open_callback, close_callback, cancel_callback, selectCheck=false } = {}) {
            const btn = document.querySelector(`[data-layer-btn="${popupId}"]`);
            const popupEl = document.querySelector(`[data-layer-id="${popupId}"]`);

            // 버튼(btn)이 없더라도 popupEl만 있으면 콜백은 달아주도록 수정
            if (!popupEl) return;
            // callback들을 저장소에 등록
            this._hooks[popupId] = {
                before_close,
                open_callback,
                close_callback,
                cancel_callback
            };

            // 버튼 클릭 이벤트 (버튼이 있을 때만)
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault(); 
                    this.open(popupId).then(() => {
                        if (typeof open_callback === 'function') open_callback();
                    });
                });
            }

            // 닫기 이벤트
            if (typeof close_callback === 'function' || typeof cancel_callback === 'function') {
                popupEl.addEventListener('popup-closed', (e) => {
                    const status = e.detail.status;
                    // confirm_callback이 아니라 파라미터로 받은 close_callback으로 수정!
                    if (status === 'close' && typeof close_callback === 'function') {
                        close_callback();
                    } 
                    else if (status === 'cancel' && typeof cancel_callback === 'function') {
                        cancel_callback();
                    }
                });
            }
        }
    },

    dialog: { // Dialog
        _createDOM: function(type, message, id, confirmText = '확인', cancelText = '취소') {
            const dialogId = id ?? 'dialog_' + new Date().getTime();
            let buttonsHTML = type === 'alert' 
                ? `<button type="button" class="btn-confirm" id="${dialogId}_confirm">${confirmText}</button>`
                : `<button type="button" class="btn-cancel" id="${dialogId}_cancel">${cancelText}</button><button type="button" class="btn-confirm" id="${dialogId}_confirm">${confirmText}</button>`;
            
            // 커스텀 다이얼로그도 role="alertdialog" 추가
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

    select: function(id, option, {open_callback, close_callback}={}){
        // bottom sheet의 select 속성을 가진 태그
        const _selectEl = document.querySelector(`[data-select-list="${id}"]`);
        if (!_selectEl) return; // 방어 코드
        const _selectField = document.querySelector(`[data-layer-btn="${id}"]`);
        const _valueEl = _selectField.querySelector("input.select-value");
        const _optionList = option;

        UI.popup.bind(id, {
            open_callback:open_callback,
            close_callback:close_callback,
            selectCheck:true
        });
        
        _optionList.forEach((opt, idx) =>{
            const _optionItem = Object.assign(document.createElement("li"), {
                className: "select-list__item",
            });
            _optionItem.setAttribute("role", "option");
            _optionItem.setAttribute("aria-selected", false);
            
            const _optionBtn = Object.assign(document.createElement("button"), {
                type: "button",
                className:"btn-item",
                innerText: opt.text,
            });
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
                checkInputStatus(_selectField);

                if(typeof opt.callback === "function"){
                    opt.callback();
                }
                
                // 업데이트된 Promise 방식 활용 (.then 사용)
                UI.popup.close(id, 'confirm');
            });
    
            _optionItem.append(_optionBtn);
            _selectEl.append(_optionItem);
        }); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});