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
        _this.addClass("is-focus");

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