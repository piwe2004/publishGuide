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
/*
$(function(){

    // 약관동의 클릭이벤트
    $(".list-button").off('click.ui').on("click.ui", function(){
        const _agreeListEl = $(this).parent().next();
        _agreeListEl.toggleClass("list-open");
        _agreeListEl.attr("aria-hidden", _agreeListEl.attr("aria-hidden") === "false");
    });

    $(".contract-tab").off("click.ui").on("click.ui", function(){
        const _contractId =  $(this).attr("data-contractId");
        $(this).attr("aria-selected", true).parent().siblings().children("button").attr("aria-selected", false);
        $(".pdf-viewer[data-contract='"+_contractId+"']").attr("aria-hidden", false).siblings().attr("aria-hidden", true)
    });

    $(".input-field").not(".tp-select").off("click.ui").on("click.ui", function(e){

        // 포커스가 이벤트 INPUT FIELD 찾기
        const _this = $(this).closest(".input-field");
        // INPUT FIELD 안에 input을 감싸는 부모 div찾기
        const _inputDiv = _this.find(".input-box__inner");
        
        // input field에 포커스중가 있다는 클래스 추가
        _this.removeClass("is-active").addClass("is-focus");

        // input을 감싸는 div의 숨김 속성 해제
        _inputDiv.attr("aria-hidden", false);
        _inputDiv.children().focus();


    }).off("focusout.ui").on("focusout.ui", function(e) {

        // 포커스가 이벤트 INPUT FIELD 찾기
        const _this = $(this).closest(".input-field");

        // input field에는 벗어났지만 포커스가 field내의 자식요소중에 있는지 확인
        const isStillInside = $.contains(this, e.relatedTarget);

        if (isStillInside) {
            // 내 구역 안에서 움직이는 거면 아무것도 하지 말고 그냥 종료!
            return;
        }

        setTimeout(() => {
            // 값이 비어있을 때 로직
                if(_this.find("input").val() === "") {
                    _this.removeClass("is-focus");
                    _this.children(".input-box__inner").attr("aria-hidden", "false");
                }else{
                    _this.addClass("is-active");
                }
        }, 10);
    });

})
*/

/**
 * @Project     : 출입관리 시스템
 * @FileName    : style.js
 * @Description : 공통 UI 동적 이벤트 스크립트 (디자인/인터랙션 전담)
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
        $agreeListEl.toggleClass("list-open");
        
        // 삼항 연산자를 사용해 명확한 문자열(String) 타입으로 토글
        const isHidden = $agreeListEl.attr("aria-hidden") === "true";
        $agreeListEl.attr("aria-hidden", isHidden ? "false" : "true");
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
    $(document).off("click.ui", ".input-field:not(.tp-select)").on("click.ui", ".input-field:not(.tp-select)", function(e){
        const $this = $(this);
        const $inputDiv = $this.find(".input-box__inner");
        
        $this.removeClass("is-active").addClass("is-focus");
        $inputDiv.attr("aria-hidden", "false");
        // 방금 마우스로 직접 클릭한 요소(e.target)가 input인지 확인합니다.
        if ($(e.target).is("input")) {
            // 이미 input을 직접 클릭한 상태라면 브라우저가 알아서 거기로 포커스를 주므로 아무것도 안함
            return; 
        } else {
            // 빈 여백이나 라벨을 클릭했을 때 첫 번째 input으로 포커스를 넘김
            $inputDiv.find("input").first().focus();
        }
    });

    // 포커스 아웃 시 상태 검사
    $(document).off("focusout.ui", ".input-field").on("focusout.ui", ".input-field", function(e) {
        // 내부 자식 요소를 클릭해서 포커스가 이동한 경우 방어
        if ($.contains(this, e.relatedTarget)) return;

        const $this = $(this);
        setTimeout(() => {
            checkInputStatus($this);
        }, 10);
    });


});