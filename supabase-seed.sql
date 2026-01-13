-- 시드 데이터
-- 스키마 생성 후 이 스크립트를 실행하세요

-- 1. 코드값 생성 (학년)
INSERT INTO "Code" ("id", "category", "value", "order", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid()::text, 'GRADE', '1학년', 1, NOW(), NOW()),
    (gen_random_uuid()::text, 'GRADE', '2학년', 2, NOW(), NOW()),
    (gen_random_uuid()::text, 'GRADE', '3학년', 3, NOW(), NOW()),
    (gen_random_uuid()::text, 'GRADE', '4학년', 4, NOW(), NOW()),
    (gen_random_uuid()::text, 'GRADE', '5학년', 5, NOW(), NOW()),
    (gen_random_uuid()::text, 'GRADE', '6학년', 6, NOW(), NOW())
ON CONFLICT ("category", "value") DO NOTHING;

-- 2. 코드값 생성 (레벨)
INSERT INTO "Code" ("id", "category", "value", "order", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid()::text, 'LEVEL', 'Level 1', 1, NOW(), NOW()),
    (gen_random_uuid()::text, 'LEVEL', 'Level 2', 2, NOW(), NOW()),
    (gen_random_uuid()::text, 'LEVEL', 'Level 3', 3, NOW(), NOW()),
    (gen_random_uuid()::text, 'LEVEL', 'Level 4', 4, NOW(), NOW()),
    (gen_random_uuid()::text, 'LEVEL', 'Level 5', 5, NOW(), NOW())
ON CONFLICT ("category", "value") DO NOTHING;

-- 3. 관리자 계정 생성
-- 비밀번호: admin123 (bcrypt 해시 필요 - 아래는 예시, 실제로는 bcrypt로 해시된 값 사용)
-- 참고: 실제 비밀번호 해시는 애플리케이션에서 생성해야 합니다
-- 여기서는 임시로 평문을 사용하지만, 실제 운영 환경에서는 반드시 해시된 비밀번호를 사용하세요

-- 관리자 계정 (비밀번호: admin123)
-- bcrypt 해시: $2a$10$isbhpnzPGxtU70WJtA20Kum//74hWiQjFAvZJvJ9Mk.J3jpA8OHDC
INSERT INTO "User" ("id", "username", "password", "name", "role", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid()::text, 'admin', '$2a$10$isbhpnzPGxtU70WJtA20Kum//74hWiQjFAvZJvJ9Mk.J3jpA8OHDC', '관리자', 'SUPER_ADMIN', NOW(), NOW())
ON CONFLICT ("username") DO NOTHING;

-- 완료 메시지
SELECT 'Seed data inserted successfully!' AS message;
SELECT 'Note: Admin password is "admin123". Please change it after first login.' AS warning;
