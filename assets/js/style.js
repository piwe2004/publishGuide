/**
 * @Project     : 출입관리 시스템
 * @FileName    : common.js
 * @Description : 공통 이벤트 스크립트
 * @Author      : 김민규
 * @Created     : 2026-04-15
 * ----------------------------------------------------------------------------
 * 연혁 (History)
 * ----------------------------------------------------------------------------
 * 날짜         작성자          내용
 * ----------  ----------  ----------------------------------------------------
 * 2026-04-15  김민규       최초 생성
 */

// =========================================================================
// [공통 함수] Input 상태 체크 및 스타일 제어
// =========================================================================
function checkInputStatus(inputField) {
    const _field = $(inputField);

    const _input = _field.find("input");
    const _innerBox = _field.find(".input-box__inner");

    // 값이 비어있는 경우 (active/focus 모두 제거)
    if (_input.val() === "") {
        _field.removeClass("is-focus is-active");
        _innerBox.attr("aria-hidden", "true");
    } 
    // 값이 있는 경우 (active 상태 유지)
    else {
        _field.removeClass("is-focus").addClass("is-active");
        _innerBox.attr("aria-hidden", "false");
    }
}

$(function(){

    // =========================================================================
    // 약관동의 아코디언 토글
    // =========================================================================
    $(document).off('click.ui', '.list-button').on('click.ui', '.list-button', function(){
        const $agreeListEl = $(this).parent().next();
        $agreeListEl.hasClass("list-open") ? $agreeListEl.attr("aria-hidden", true) : $agreeListEl.attr("aria-hidden", false);
        $agreeListEl.toggleClass("list-open");
    });


    // =========================================================================
    // 계약서 탭 클릭 이벤트
    // =========================================================================
    $(document).off("click.ui", ".contract-tab").on("click.ui", ".contract-tab", function(){
        const contractId = $(this).attr("data-contractId");
        
        // 탭 상태 변경 (형제 요소 aria-selected false 처리)
        $(this).attr("aria-selected", "true")
               .parent().siblings().children(".contract-tab").attr("aria-selected", "false");
        
        // 연결된 PDF 뷰어 표시
        $(".pdf-viewer[data-contract='" + contractId + "']").attr("aria-hidden", "false")
               .siblings().attr("aria-hidden", "true");
    });


    // =========================================================================
    // Input Field 인터랙션 (플로팅 라벨)
    // =========================================================================
    
    // 클릭 시 포커스 활성화
    $(document).off("click.ui focusin.ui", ".input-field:not(.tp-select)").on("click.ui focusin.ui", ".input-field:not(.tp-select)", function(e){
        const $this = $(this);
        const $inputDiv = $this.find(".input-box__inner");

        
        // 이미 is-focus 상태면 클래스 조작만 건너뜀
        if ($this.hasClass("is-focus")) return;
        
        $this.removeClass("is-active").addClass("is-focus");
        $inputDiv.attr("aria-hidden", "false");
        // input 직접 클릭이 아닐 때(패딩/라벨)는 is-focus 여부와 무관하게 항상 focus() 호출
        // → focusout이 발생해도 activeElement가 field 안으로 복귀하여 깜빡임 방지
        if (!$(e.target).is("input")) {
            $inputDiv.find("input").first().focus();
        }
    });

    // 포커스 아웃 시 상태 검사
    $(document).off("focusout.ui", ".input-field").on("focusout.ui", ".input-field", function(e) {
        console.log(e.currentTarget, $(this));
        // 내부 자식 요소를 클릭해서 포커스가 이동한 경우 방어
        // if ($.contains(this, e.relatedTarget)) return;
        if (e.relatedTarget && this.contains(e.relatedTarget)) return;

        const $this = $(this);
        setTimeout(() => {
        if ($.contains($this[0], document.activeElement)) return;
            checkInputStatus($this);
        }, 10);
    });

    // input 텍스트 삭제
    $(document).off("click.ui", ".input-box__clear").on("click.ui", ".input-box__clear", function(e){
        $this = $(this);
        $this.parent().children("input.input-box__item").val("").focus();
    });


});