# API 명세 작성 예제 — 추천받기

- 작성일: 2026-09-07
- 대상: 주최자가 추천받기를 누르면 최상위 구간 하나가 즉시 확정되는 작업
- 명세 원본: [api/openapi.yaml](api/openapi.yaml)
- 상태: 학습·리뷰용 API 계약 초안. 서버·DB 구현 전. 전체 서비스 API 중 한 개만 완성한 예제

## 1. OpenAPI와 YAML은 무엇인가

OpenAPI는 HTTP API의 요청·응답·권한·자료형을 정해진 형식으로 적는 명세 표준이다. 공개 API를 뜻하는 일반 표현인 '오픈 API'와 구분한다. OpenAPI로 적었다고 누구나 호출할 수 있게 되는 것은 아니다.

YAML은 데이터를 들여쓰기로 표현하는 파일 형식이다. OpenAPI는 YAML이나 JSON으로 작성할 수 있다. 이 예제는 설명과 주석을 읽기 편하도록 YAML을 쓴다.

명세 파일을 작성해도 서버가 생기거나 DB에 저장되지는 않는다. 명세는 요청 방법과 기대 동작을 정의하고, 실행 코드는 이를 구현한다. Swagger UI·Editor 같은 도구는 명세를 사람이 읽을 수 있는 API 문서 화면으로 보여준다.

형식의 기준은 [OpenAPI 3.1.0 공식 명세](https://spec.openapis.org/oas/v3.1.0.html), 도구와 표준의 구분은 [Swagger 설명](https://swagger.io/docs/specification/v3_0/about/)을 참고한다. 3.1.0은 이 예제가 선택한 버전이며 최신 버전이라는 뜻은 아니다.

## 2. 이 예제에서 선택한 API

```http
POST /rooms/{roomId}/confirmation
```

`POST`는 새 확정을 만드는 처리를 실행한다. `rooms/{roomId}`는 대상 모임, `confirmation`은 모임에 최대 하나만 존재하는 현재 확정 구간을 나타낸다. URI의 복수·단수 선택은 프로젝트 관례이고 유일한 정답은 아니다.

성공 코드는 `201 Created`로 정했다. 추천 계산에 그치지 않고 새 확정을 만들기 때문이다. DB에서는 rooms를 UPDATE하더라도 API 관점에서는 현재 확정이라는 대상을 새로 만드는 작업이다. HTTP 메서드와 응답 코드를 SQL 명령어에 일대일 대응시키지 않는다. [201 의미](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/201)

아래 서버 주소는 문서용이며 동작하지 않는다. Supabase의 자동 REST API 경로도 아니다. 실제 구현 때 프론트엔드에서 호출할 경로 또는 RPC(저장된 함수를 호출하는 방식)와 연결한다. 별도 서버 도입이 확정된 것은 아니다.

## 3. 요청 예시

```http
POST /rooms/6f8204c8-2f24-4e30-92de-3ddde73188fc/confirmation HTTP/1.1
Host: api.example.invalid
Authorization: Bearer HOST_TOKEN_PLACEHOLDER
Accept: application/json
```

마지막 토큰 문자열은 가짜 자리표시자다. 실제 권한 토큰을 문서나 Git에 넣지 않는다.

| 위치 | 항목 | 자료형 | 필수 | 이유 |
| --- | --- | --- | --- | --- |
| Path | roomId | string, UUID 형식 | 예 | 어떤 모임을 확정할지 식별 |
| Header | Authorization | Bearer 형식의 토큰 문자열 | 예 | 서버가 해당 모임의 주최자인지 검사 |
| Query | 없음 | — | — | 조회 조건을 받지 않음 |
| Body | 없음 | — | — | 응답·날짜·소요 시간은 이미 서버에 있음 |

POST라고 반드시 Body가 있어야 하는 것은 아니다. 이 요청에서 날짜나 소요 시간을 다시 받으면 저장된 값과 불일치할 수 있다. 주최자임을 주장하는 `isHost: true`도 받지 않는다. 권한은 서버가 토큰으로 판단한다.

여기서는 토큰 원문을 Bearer 방식으로 전달하는 설계 예시다. Bearer는 JWT라는 뜻이 아니며, 토큰 보관·Supabase 인증과의 연결은 서버 구현 때 검토한다.

## 4. 성공 응답 예시

```http
HTTP/1.1 201 Created
Content-Type: application/json
```

```json
{
  "roomId": "6f8204c8-2f24-4e30-92de-3ddde73188fc",
  "confirmation": {
    "roomDateId": "c1154b13-4f04-457e-94a2-9800404a50cd",
    "localDate": "2026-09-12",
    "timezone": "Asia/Seoul",
    "startMinute": 1140,
    "endMinute": 1260,
    "durationMinutes": 120,
    "availableCount": 4,
    "totalCount": 6
  }
}
```

화면은 '9월 12일 19:00–21:00 확정 · 6명 중 4명 가능'을 그릴 수 있다. availableCount는 구간의 모든 칸에 가능한 사람 수다. submitted_at이 없는 주최자는 totalCount에 포함하지 않는다. needs_review 참여자는 제출 인원에는 포함하되, 답하지 않은 새 칸은 가능으로 세지 않는다.

`confirmation`으로 관련 값을 묶은 것은 API 설계 선택이다. DB에는 확정 날짜와 시작만 저장하고 종료와 인원수는 계산한다. API에는 화면이 필요한 계산값도 포함할 수 있다.

## 5. 실패 응답

HTTP 상태 코드는 넓은 실패 종류를, `error.code`는 우리 앱의 구체적인 원인을 나타낸다. `message`는 사람에게 보여줄 문구다. 프론트엔드가 문구 자체를 비교하면 문구 수정만으로 동작이 깨질 수 있으므로 `code`로 분기한다.

| HTTP | error.code | 조건 | 저장 결과 |
| --- | --- | --- | --- |
| 400 | INVALID_ROOM_ID | UUID 형식이 아님 | 변경 없음 |
| 401 | UNAUTHORIZED | 토큰 누락·인증 불가 | 변경 없음 |
| 403 | HOST_ONLY | 유효한 참여자 토큰 등이며 해당 모임 주최자가 아님 | 변경 없음 |
| 404 | ROOM_NOT_FOUND | 형식은 맞지만 모임이 없음 | 변경 없음 |
| 409 | ALREADY_CONFIRMED | 현재 확정 구간이 있음 | 기존 확정 유지 |
| 409 | NO_RESPONSES | 제출된 응답이 없음 | 미확정 유지 |
| 409 | NO_CANDIDATES | 제외 후 남은 후보 구간이 없음 | 미확정 유지 |
| 409 | NO_AVAILABLE_INTERVAL | 남은 후보는 있지만 최고 가능 인원이 0명 | 미확정 유지 |
| 500 | INTERNAL_ERROR | 예상하지 못한 서버 계산·저장 오류 | 해당 변경 롤백 |

409를 네 상황에 쓴 이유는 현재 모임 상태가 새 확정을 허용하지 않기 때문이다. 이 상세 배정은 우리 API의 설계 선택이며 모든 회사가 같은 오류 코드를 쓰는 것은 아니다. [409 의미](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/409)

```json
{
  "error": {
    "code": "NO_AVAILABLE_INTERVAL",
    "message": "가능한 시간이 없어요."
  }
}
```

## 6. YAML 읽는 순서

아래는 원본에서 읽어볼 주요 항목이다. 스키마(schema)는 데이터가 어떤 필드와 자료형을 가져야 하는지 적은 규칙이다.

| 순서 | YAML 항목 | 실제 역할 |
| --- | --- | --- |
| 1 | openapi | 이 파일이 따르는 OpenAPI 표준 버전 |
| 2 | info | API 문서 이름·문서 버전·설명 |
| 3 | servers | 호출할 서버 주소. 현재는 가짜 예시 |
| 4 | paths → 경로 → post | 호출 주소와 동작 |
| 5 | parameters | roomId의 위치·필수 여부·UUID 형식 |
| 6 | security | 사용할 권한 전달 방식 |
| 7 | responses | 상태 코드별 설명·응답 스키마·실제 예시 |
| 8 | components | 재사용할 스키마와 권한 방식 정의 |

```yaml
roomId:
  type: string
  format: uuid
```

이 부분은 문자열이면서 UUID 형식을 기대한다는 뜻이다. `required`는 해당 필드가 빠지면 안 된다는 뜻이며, `type: string`과 함께 쓰면 NULL도 허용하지 않는다. `minimum`, `multipleOf`는 각각 최솟값과 배수 조건이다.

```yaml
schema:
  $ref: '#/components/schemas/ConfirmationResult'
```

`$ref`는 아래에 적어둔 ConfirmationResult 정의를 가져다 쓰라는 뜻이다. 성공 응답의 형태를 한 곳에서 관리할 수 있다. `examples`는 그 규칙에 맞는 실제 데이터 샘플이며, 규칙 그 자체를 대신하지 않는다.

오류 응답이 반복되어 원본 YAML은 길지만 서버 코드를 많이 만든 것은 아니다. 처음에는 paths 아래의 POST와 201 응답을 보고, 그 응답의 `$ref`를 따라 내려가면 된다.

## 7. 실무에서 검토할 부분

1. 명세의 목적을 제품 흐름과 맞춘다. 추천 계산만 하는 API로 오해하면 안 된다.
2. 요청에 꼭 필요한 것만 받는다. 저장된 응답을 클라이언트가 재전송하지 않는다.
3. 응답의 필수 필드와 계산 기준을 명확히 한다. 사람 수가 어느 시점 기준인지도 적는다.
4. 성공뿐 아니라 실패 결과를 정한다. 실패 시 데이터가 바뀌는지까지 설명한다.
5. 중복 클릭과 통신 실패를 검토한다. 동시에 요청해도 확정을 덮어쓰지 않아야 한다.
6. 명세를 검사하고 리뷰한 뒤 구현한다. 구현한 API도 실제로 이 계약을 따르는지 검사한다.

이번 설계에서 같은 모임의 변경 작업은 순서를 정해 처리한다. 동시에 두 추천 요청이 오면 하나만 새 확정을 만들고 다른 요청은 이미 확정됨으로 처리한다. 이 규칙은 YAML을 적는 것만으로 실행되지 않으며 서버·DB 코드로 구현해야 한다.

응답을 못 받은 상황은 확정 실패와 다르다. 서버는 저장했는데 통신만 끊겼을 수 있으므로 재요청 전에 모임을 조회하도록 명세에 적었다. 영구적인 재시도 키 저장 기능은 아직 도입하지 않았다.

## 8. 검증과 범위

이 파일과 OpenAPI는 설명·계약 예제다. 실제 서버 동작·트랜잭션·권한 검증이 구현됐다는 뜻은 아니다. OpenAPI 문법·참조와 응답 예시의 스키마 일치를 별도로 검사한다. 종료=시작+소요 시간, 가능 인원≤총 인원 같은 필드 간 조건은 추가로 확인한다.

2026-09-07 검사 결과: Swagger Parser로 OpenAPI 3.1 문법·참조 검사 통과. Ajv와 형식 검사기로 응답 예시 10개 검증 통과. 0명 확정, 필수 날짜 ID 누락, 1시간 단위 위반, 잘못된 UUID, 존재하지 않는 날짜, NULL 확정, 응답에 토큰 필드 추가의 잘못된 예시 7개가 모두 거부되는 것을 확인했다. 정상 예시의 종료 계산과 인원수 관계도 확인했다. 검사 도구는 임시 폴더에서 사용했으며 앱 의존성에 추가하지 않았다.

현재 종료 24:00 허용 여부와 이름 길이 같은 다른 입력 정책은 열린 질문으로 유지한다. 이번 예제는 기존 10:00–22:00 범위 안의 값만 사용한다.

## 9. 직접 할 다음 업무

이 예제를 읽은 뒤 취소 API의 Path·메서드·요청 필드·성공/오류 응답을 작성한다. 처음부터 전부 만들지 않고 paths에 들어갈 한 작업부터 작성한다.

특히 '취소할 시간이 무엇인지'를 요청에서 어떻게 표현할지 판단한다. 예전 화면에서 보낸 취소가 새 확정 시간을 취소하지 않도록 해야 한다. 초안이 오면 기능 규칙·HTTP 의미·자료형·예외 처리 순서로 리뷰한다.
