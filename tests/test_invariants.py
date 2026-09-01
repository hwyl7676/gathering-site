"""
[gathering-site 회귀 방지 단위 테스트 (Regression Guard Suite)]
- 전역 철통 핀코드 대문(Hard Lock Gatekeeper) 무결성 및 당일 자정 만료 회귀 방지
- 배포 전 프론트엔드 보안 게이트가 훼손되었을 경우 즉시 FAIL을 발생시켜 배포를 차단함.
"""

import os
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class TestGatheringSiteInvariants(unittest.TestCase):
    """Gathering Site 불변 프론트엔드 보안 게이트 회귀 방지 테스트"""

    def setUp(self) -> None:
        self.index_html_path = os.path.join(BASE_DIR, "index.html")
        self.calculator_html_path = os.path.join(BASE_DIR, "calculator.html")
        self.css_path = os.path.join(BASE_DIR, "assets", "css", "style.css")
        self.js_path = os.path.join(BASE_DIR, "assets", "js", "main.js")
        self.cname_path = os.path.join(BASE_DIR, "CNAME")

    def test_invariant_index_hard_lock_structure(self) -> None:
        """[불변 룰 1] index.html의 초기 화면 완전 차단(pin-locked & 모달 노출) 무결성 검증"""
        self.assertTrue(os.path.exists(self.index_html_path), "index.html이 존재해야 함")
        with open(self.index_html_path, "r", encoding="utf-8") as f:
            content = f.read()

        # 1. body class="pin-locked" 기본 적용 여부
        self.assertIn('<body class="pin-locked">', content, "index.html의 body는 초기 상태에서 pin-locked 클래스를 가져야 함")

        # 2. global-pin-gate-modal이 hidden 없이 기본 활성화되어 있는지 여부
        self.assertIn('id="global-pin-gate-modal" class="global-pin-overlay"', content, "index.html의 핀코드 모달은 기본 hidden 없이 오버레이되어야 함")

        # 3. head 내 화·목 회차 만료 FOUC 방어 인라인 스크립트 존재 여부
        self.assertIn('gh_member_pin_cycle', content, "index.html의 head에 화·목 회차 기반 만료 인라인 스크립트가 있어야 함")
        self.assertIn('pin-gate-locked', content, "index.html의 head 스크립트에 pin-gate-locked 처리 로직이 있어야 함")

    def test_invariant_calculator_hard_lock_structure(self) -> None:
        """[불변 룰 2] calculator.html의 초기 화면 완전 차단 무결성 검증"""
        self.assertTrue(os.path.exists(self.calculator_html_path), "calculator.html이 존재해야 함")
        with open(self.calculator_html_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn('<body class="pin-locked">', content, "calculator.html의 body는 초기 상태에서 pin-locked 클래스를 가져야 함")
        self.assertIn('id="global-pin-gate-modal" class="global-pin-overlay"', content, "calculator.html의 핀코드 모달은 기본 hidden 없이 오버레이되어야 함")
        self.assertIn('gh_member_pin_cycle', content, "calculator.html의 head에 화·목 회차 기반 만료 인라인 스크립트가 있어야 함")

    def test_invariant_css_hard_lock_rules(self) -> None:
        """[불변 룰 3] style.css의 철통 암전/블러 및 포인터 이벤트 차단 CSS 규칙 검증"""
        self.assertTrue(os.path.exists(self.css_path), "style.css가 존재해야 함")
        with open(self.css_path, "r", encoding="utf-8") as f:
            css = f.read()

        self.assertIn("html.pin-gate-locked", css, "style.css에 html.pin-gate-locked 규칙이 정의되어 있어야 함")
        self.assertIn("body.pin-locked", css, "style.css에 body.pin-locked 규칙이 정의되어 있어야 함")
        self.assertIn("pointer-events: none", css, "잠금 시 배경 클릭이 차단되어야 함")
        self.assertIn("blur(", css, "잠금 시 배경 블러 필터가 적용되어야 함")

    def test_invariant_js_tue_thu_cycle_expiry_logic(self) -> None:
        """[불변 룰 4] main.js의 화·목 2회차 발급 주기(Cycle Key) 검증 로직 무결성"""
        self.assertTrue(os.path.exists(self.js_path), "main.js가 존재해야 함")
        with open(self.js_path, "r", encoding="utf-8") as f:
            js = f.read()

        self.assertIn("gh_member_pin", js, "main.js에 gh_member_pin 키 처리가 있어야 함")
        self.assertIn("gh_member_pin_cycle", js, "main.js에 gh_member_pin_cycle 회차 키 처리가 있어야 함")
        self.assertIn("getPinCycleKey", js, "main.js에 getPinCycleKey 함수가 있어야 함")
        self.assertIn("pin-gate-locked", js, "main.js에 pin-gate-locked 해제 로직이 있어야 함")

    def test_invariant_cname_configuration(self) -> None:
        """[불변 룰 5] CNAME 도메인 무결성 검증"""
        self.assertTrue(os.path.exists(self.cname_path), "CNAME 파일이 존재해야 함")
        with open(self.cname_path, "r", encoding="utf-8") as f:
            cname = f.read().strip()
        self.assertEqual(cname, "gathering-house.kr", "CNAME은 gathering-house.kr 이어야 함")

if __name__ == "__main__":
    unittest.main()
