# 판정 대조표

## R001 / B-3439c355-a6e9-4d55-a048-4cc8472c60ca-t1

```json
{
  "pointId": "B-3439c355-a6e9-4d55-a048-4cc8472c60ca-t1",
  "source": "B",
  "stratum": "initial",
  "sessionId": "3439c355-a6e9-4d55-a048-4cc8472c60ca",
  "turn": 1,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "PASS",
        "reason": "상법의 추가 적용과 법적 통제 정교화의 관계를 확인했습니다."
      },
      {
        "axisId": "AX2",
        "status": "PASS",
        "reason": "법인격의 귀속과 실제 결정 권한의 담당 주체를 모두 확인했습니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "durationMs": 8820,
        "usage": {
          "inputTokens": 5973,
          "outputTokens": 697,
          "cacheWriteTokens": 376,
          "cacheReadTokens": 5594
        },
        "stages": [
          {
            "stage": "central_story_gate",
            "durationMs": 8820,
            "usage": {
              "inputTokens": 5973,
              "outputTokens": 697,
              "cacheWriteTokens": 376,
              "cacheReadTokens": 5594
            }
          }
        ]
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "경제적 이익을 목적으로 하는 주식회사는 상법의 적용을 받아 자산 운용에 대한 법적 통제가 더 정교해진다.",
          "주식회사는 사단 법인이자 영리 법인이며, 법인격은 구성원 단체에 부여된다.",
          "이사회·주주 총회·특정 개인이 자산 운용 권한을 받아 법령의 범위 안에서 결정권을 행사한다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "법인의 종류와 자산 운용의 기본 원칙은 민법에도 규정되어 있고, 주식회사는 이에 더해 상법의 적용을 함께 받는다는 점"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "주식회사처럼 영리를 목적으로 하는 법인에는 상법이 적용되어 자산 운용에 대한 법적 통제가 정교해진다.",
          "주식회사는 사단 법인이자 영리 법인이므로 법인격이 단체에 부여된다.",
          "이사회·주주총회·특정 개인은 자산 운용 권한을 받아 법령 안에서 결정권을 행사한다."
        ],
        "brokenRelation": null,
        "unconfirmed": [],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    }
  }
}
```

## R002 / A-N19

```json
{
  "pointId": "A-N19",
  "source": "A",
  "stratum": "initial",
  "sessionId": "aa26998e-eefe-4184-a01b-47ac3b071523",
  "turn": 1,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "PASS",
        "reason": "상법의 추가 적용과 자산 운용 통제의 제도화를 연결해 표현했습니다."
      },
      {
        "axisId": "AX2",
        "status": "PASS",
        "reason": "법인격의 귀속과 실제 자산 운용 권한의 담당자를 구분했습니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N19-v4",
        "durationMs": 9104.613074000023,
        "costUsd": 0.012000299999999998,
        "usage": {
          "input_tokens": 5968,
          "input_tokens_details": {
            "cache_write_tokens": 371,
            "cached_tokens": 5594
          },
          "output_tokens": 829,
          "output_tokens_details": {
            "reasoning_tokens": 154
          },
          "total_tokens": 6797
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "경제적 이익을 추구하는 법인은 민법뿐 아니라 상법의 적용도 받아 자산 운용 통제가 제도화된다.",
          "주식회사는 사단 법인이자 영리 법인이고, 법인격은 구성원 단체에 부여된다.",
          "주식회사의 자산 운용 권한은 이사회·주주 총회·특정 개인에게 주어진다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "권한을 받은 이들이 정해진 법령 내에서 결정권을 행사한다는 제한"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "경제적 이익을 추구하는 법인은 민법과 상법의 적용을 함께 받아 자산 운용 통제가 제도화된다.",
          "주식회사는 사단 법인이자 영리 법인이고, 법인격은 구성원 단체에 부여된다.",
          "주식회사의 자산 운용 권한은 이사회, 주주 총회, 특정 개인에게 주어진다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "권한을 받은 이사회·주주 총회·특정 개인은 정해진 법령 내에서 결정권을 행사한다는 제한 조건"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    }
  }
}
```

## R003 / A-N40

```json
{
  "pointId": "A-N40",
  "source": "A",
  "stratum": "initial",
  "sessionId": "6bd2d3e4-c11f-48c8-a402-66d3e543b233",
  "turn": 1,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "PASS",
        "reason": "인지질의 양친매적 부분, 꼬리의 집합, 친수성 물질 투과 차단의 연결이 확인됩니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N40-v4",
        "durationMs": 6955.191993999993,
        "costUsd": 0.0110383,
        "usage": {
          "input_tokens": 6044,
          "input_tokens_details": {
            "cache_write_tokens": 447,
            "cached_tokens": 5594
          },
          "output_tokens": 733,
          "output_tokens_details": {
            "reasoning_tokens": 82
          },
          "total_tokens": 6777
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "인지질은 소수성 꼬리와 친수성인 음전하 인산기 머리로 이루어져 세포막을 구성한다.",
          "소수성 꼬리들은 인력으로 서로 몰려 있다.",
          "이러한 세포막의 구성 때문에 친수성 물질의 세포막 투과가 차단된다.",
          "지질 분자는 지방산으로 이루어져 소수성을 띤다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "친수성 머리가 세포 외부와 세포질의 수용액에 접한다는 배치",
          "인지질이 친수성·소수성 용매 모두와 섞이는 양친매성 물질이라는 점"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "세포막은 친수성 인산기 머리와 소수성 지방산 꼬리를 가진 인지질로 구성된다.",
          "소수성 꼬리들이 인력으로 몰려 있는 세포막의 구조 때문에 친수성 물질의 세포막 투과가 차단된다.",
          "지질 분자는 지방산으로 이루어져 소수성을 띤다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "친수성 머리가 세포 외부와 세포질의 수용액에 접하고 소수성 꼬리가 서로 모이는 구체적 배열",
          "인지질이 친수성·소수성 용매 모두와 섞일 수 있는 양친매성 물질이라는 점"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    }
  }
}
```

## R004 / B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t1

```json
{
  "pointId": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t1",
  "source": "B",
  "stratum": "initial",
  "sessionId": "222e04c0-dd5b-49f0-ac64-5e14721696b2",
  "turn": 1,
  "v4": {
    "overall": "unresolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "UNCLEAR_SERIOUS",
        "reason": "달명·유명·사명은 언급했지만, 지시하는 대상의 외연 크기에 따른 구분 관계는 표현되지 않았다."
      },
      {
        "axisId": "AX2",
        "status": "UNCLEAR_SERIOUS",
        "reason": "유명이 상황에 따라 한 개체만 가리키는 사명으로 쓰일 수 있다는 내용은 언급되지 않았다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "durationMs": 11759,
        "usage": {
          "inputTokens": 9477,
          "outputTokens": 708,
          "cacheWriteTokens": 1435,
          "cacheReadTokens": 8036
        },
        "stages": [
          {
            "stage": "central_story_gate",
            "durationMs": 8217,
            "usage": {
              "inputTokens": 6054,
              "outputTokens": 526,
              "cacheWriteTokens": 457,
              "cacheReadTokens": 5594
            }
          },
          {
            "stage": "selective_feedback",
            "durationMs": 3542,
            "usage": {
              "inputTokens": 3423,
              "outputTokens": 182,
              "cacheWriteTokens": 978,
              "cacheReadTokens": 2442
            }
          }
        ]
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "후기 묵가가 명을 달명·유명·사명으로 구분한다."
        ],
        "brokenRelation": {
          "description": "달명·유명·사명이 지시하는 대상의 범위에 따라 구별되며, 특히 유명이 하나의 대상에만 대응하면 사명이 될 수 있다는 핵심 관계가 빠졌다.",
          "studentQuote": "후기 묵가의 명에 대한 입장: 달명, 유명, 사명 존재",
          "kind": "missing"
        },
        "unconfirmed": [
          "달명은 천지 만물 전체를 가리킨다.",
          "유명은 공통 속성을 지닌 여러 사물을 가리킨다.",
          "사명은 하나의 대상만 가리키며, 고유명사 또는 유명을 특정 개체에 한정해 쓴 경우가 될 수 있다."
        ],
        "questionWorthy": true,
        "question": "달명·유명·사명은 각각 지시하는 대상의 범위가 어떻게 다르며, 유명이 사명이 되는 경우는 언제인가?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t1-H0-attribution",
        "pointId": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t1",
        "arm": "H0",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1",
            "AX2"
          ],
          "unconfirmedAttribution": [
            [
              "AX1"
            ],
            [
              "AX1"
            ],
            [
              "AX1",
              "AX2"
            ]
          ],
          "reason": "누락된 핵심 관계는 명의 구분이 지시 대상의 외연 크기에 따른다는 점(AX1)과, 유명이 특정 상황에서는 하나의 개체를 지시하는 사명으로 쓰일 수 있다는 점(AX2)에 해당한다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "후기 묵가의 명에는 달명·유명·사명이 있다는 점"
        ],
        "brokenRelation": {
          "description": "달명·유명·사명의 구분이 지시하는 실의 범위에 따른 것이며, 유명이 상황에 따라 하나의 개체만 지시하면 사명이 될 수 있다는 관계가 제시되지 않았다.",
          "studentQuote": "후기 묵가의 명에 대한 입장: 달명, 유명, 사명 존재",
          "kind": "inter-axis-relation"
        },
        "unconfirmed": [],
        "questionWorthy": true,
        "question": "달명·유명·사명은 각각 무엇을 얼마나 넓게 가리키는지, 그리고 ‘새’ 같은 유명이 언제 사명이 될 수 있는지 설명해 볼 수 있나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t1-H1-attribution",
        "pointId": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t1",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1",
            "AX2"
          ],
          "unconfirmedAttribution": [],
          "reason": "누락된 내용은 세 명칭의 구분 기준인 지시 대상의 외연 차이(AX1)와 유명이 특정 상황에서 사명으로 기능할 수 있다는 전환 관계(AX2)를 함께 다룬다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R005 / B-19b3cc0d-e828-4163-838b-e0b871b6f446-t1

```json
{
  "pointId": "B-19b3cc0d-e828-4163-838b-e0b871b6f446-t1",
  "source": "B",
  "stratum": "initial",
  "sessionId": "19b3cc0d-e828-4163-838b-e0b871b6f446",
  "turn": 1,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "UNCLEAR_OK",
        "reason": "지시 대상의 구분은 확인되지만, 그 구분을 속성 유무와 연결한 근거는 아직 드러나지 않았습니다."
      },
      {
        "axisId": "AX2",
        "status": "UNCLEAR_OK",
        "reason": "용법 구분은 확인되지만, 요구할 수 있는 대상 범위의 차이가 두 명이 다르다는 근거라는 연결은 아직 드러나지 않았습니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "durationMs": 11748,
        "usage": {
          "inputTokens": 6051,
          "outputTokens": 798,
          "cacheWriteTokens": 454,
          "cacheReadTokens": 5594
        },
        "stages": [
          {
            "stage": "central_story_gate",
            "durationMs": 11748,
            "usage": {
              "inputTokens": 6051,
              "outputTokens": 798,
              "cacheWriteTokens": 454,
              "cacheReadTokens": 5594
            }
          }
        ]
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "공손룡은 ‘말’과 ‘흰말’이 지시하는 대상이 다르므로 두 명칭의 용법을 구분해야 한다고 보았다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "‘말’은 형체를, ‘희다’는 색을 가리킨다는 구분을 근거로 흰말이 말과 다르다고 한 논증",
          "말을 구하는 경우와 흰말을 구하는 경우에 허용되는 대상이 다르다는 예시"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "공손룡은 ‘말’과 ‘흰말’이 지시하는 대상이 서로 다르므로 두 명의 용법을 구분해야 한다고 본다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "말과 흰말의 차이를 색이라는 속성의 유무와 요구할 수 있는 대상 범위의 차이로 근거 짓는 방식"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    }
  }
}
```

## R006 / A-N09

```json
{
  "pointId": "A-N09",
  "source": "A",
  "stratum": "followup",
  "sessionId": "44635a71-2fc6-42ae-a4f9-28833c4c04ef",
  "turn": 2,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "PASS",
        "reason": "장벽에 막힌다고 설명했다."
      },
      {
        "axisId": "AX2",
        "status": "PASS",
        "reason": "합성 단계와 후뉴런 수용체 결합을 통한 신호 전달을 연결했다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N09-v4",
        "durationMs": 8025.9162979999965,
        "costUsd": 0.013650299999999999,
        "usage": {
          "input_tokens": 6316,
          "input_tokens_details": {
            "cache_write_tokens": 719,
            "cached_tokens": 5594
          },
          "output_tokens": 894,
          "output_tokens_details": {
            "reasoning_tokens": 137
          },
          "total_tokens": 7210
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "도파민은 도파민성 뉴런에서 합성되어 신경 전달 물질로 작용한다.",
          "티로신이 시냅스 전 뉴런에 흡수된 뒤 레보도파를 거쳐 도파민으로 합성된다.",
          "합성된 도파민은 시냅스 후 뉴런의 수용체에 결합하여 뉴런 간 신호를 전달한다.",
          "음식이나 약물로 체내에 들어온 도파민은 장벽에 막혀 뇌로 들어가지 못한다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "합성된 도파민이 시냅스 소포에 저장되었다가 뉴런 활성화 시 시냅스 틈으로 분비되는 과정"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "도파민은 뉴런에서 합성되어 신경 전달 물질로 기능한다.",
          "티로신이 시냅스 전 뉴런에 흡수된 뒤 레보도파를 거쳐 도파민으로 합성된다.",
          "합성된 도파민은 시냅스 후 뉴런의 수용체에 결합하여 뉴런 간 신호를 전달한다.",
          "음식이나 약물로 들어온 도파민은 장벽에 막혀 뇌에서 흡수·작용하지 못한다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "합성된 도파민이 시냅스 소포에 저장되었다가 뉴런 활성화 시 분비된다는 조건"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    }
  }
}
```

## R007 / B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t3

```json
{
  "pointId": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t3",
  "source": "B",
  "stratum": "followup",
  "sessionId": "222e04c0-dd5b-49f0-ac64-5e14721696b2",
  "turn": 3,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "PASS",
        "reason": "외연 크기가 구분 기준이라는 핵심 관계가 확인되었습니다."
      },
      {
        "axisId": "AX2",
        "status": "PASS",
        "reason": "유명이 하나의 개체를 지시하도록 사용될 수 있다는 핵심 의미가 확인되었습니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "durationMs": 12015,
        "usage": {
          "inputTokens": 6555,
          "outputTokens": 912,
          "cacheWriteTokens": 958,
          "cacheReadTokens": 5594
        },
        "stages": [
          {
            "stage": "central_story_gate",
            "durationMs": 12015,
            "usage": {
              "inputTokens": 6555,
              "outputTokens": 912,
              "cacheWriteTokens": 958,
              "cacheReadTokens": 5594
            }
          }
        ]
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "후기 묵가의 명에는 달명·유명·사명이 존재한다.",
          "달명·유명·사명은 외연의 크기에 따라 구분된다.",
          "유명은 개체를 가리키는 데 쓰일 수 있다."
        ],
        "brokenRelation": {
          "description": "달명·유명·사명이 각각 모든 사물, 속성을 공유하는 복수의 사물, 하나의 대상이라는 서로 다른 지시 범위를 가진다는 구분과, 유명이 대상이 하나로 한정되는 상황에서는 사명이 될 수 있다는 조건부 관계가 제시되지 않았다.",
          "studentQuote": "후기 묵가의 명에 대한 입장: 달명, 유명, 사명 존재",
          "kind": "missing"
        },
        "unconfirmed": [
          "달명은 천지 만물 전체를 지시한다.",
          "유명은 공통 속성을 지닌 여러 사물을 지시한다.",
          "사명은 하나의 대상만 지시한다.",
          "‘새’라는 명은 대응 대상의 수에 따라 유명 또는 사명이 될 수 있다."
        ],
        "questionWorthy": true,
        "question": "달명·유명·사명은 각각 몇 개 또는 어떤 범위의 대상을 가리키며, ‘새’ 같은 유명이 언제 사명이 될 수 있나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t3-H0-attribution",
        "pointId": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t3",
        "arm": "H0",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1",
            "AX2"
          ],
          "unconfirmedAttribution": [
            [
              "AX1"
            ],
            [
              "AX1"
            ],
            [
              "AX1"
            ],
            [
              "AX2"
            ]
          ],
          "reason": "누락된 구분은 달명·유명·사명의 지시 대상 외연 크기에 관한 것이므로 AX1에 해당한다. 또한 유명이 지시 대상을 하나로 한정할 때 사명이 될 수 있다는 조건부 관계는 AX2에 해당한다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "resolved/unresolved",
      "effectiveCell": "resolved/unresolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "후기 묵가의 명에는 달명·유명·사명이 있다.",
          "이 명들은 외연의 크기에 따라 구분된다.",
          "유명은 개체를 가리키는 데 사용될 수 있다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "유명이 단 하나의 개체에 대응할 때 사명으로 정해진다는 구체적 조건",
          "달명·유명·사명의 각각의 지시 범위"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    }
  }
}
```

## R008 / B-d66848d6-e46d-4314-b9ad-3469076eaa2b-t1

```json
{
  "pointId": "B-d66848d6-e46d-4314-b9ad-3469076eaa2b-t1",
  "source": "B",
  "stratum": "initial",
  "sessionId": "d66848d6-e46d-4314-b9ad-3469076eaa2b",
  "turn": 1,
  "v4": {
    "overall": "unresolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "PASS",
        "reason": "명실론의 위상 변화가 확인되었다."
      },
      {
        "axisId": "AX2",
        "status": "UNCLEAR_SERIOUS",
        "reason": "대표 학파 간 논쟁은 언급했지만, 대표 주체가 누구이며 명실 문제를 전문적으로 다뤘다는 점은 확인되지 않았다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "durationMs": 14859,
        "usage": {
          "inputTokens": 9143,
          "outputTokens": 935,
          "cacheWriteTokens": 9137,
          "cacheReadTokens": 0
        },
        "stages": [
          {
            "stage": "central_story_gate",
            "durationMs": 11238,
            "usage": {
              "inputTokens": 5887,
              "outputTokens": 744,
              "cacheWriteTokens": 5884
            }
          },
          {
            "stage": "selective_feedback",
            "durationMs": 3621,
            "usage": {
              "inputTokens": 3256,
              "outputTokens": 191,
              "cacheWriteTokens": 3253
            }
          }
        ]
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [],
        "brokenRelation": {
          "description": "명실 문제가 정치·윤리 차원에서 독립적인 철학 주제로 정립되었다는 위상 변화와, 그 시기에 공손룡과 후기 묵가 사이의 철학적 논쟁이 펼쳐졌다는 중심 관계가 드러나지 않는다.",
          "studentQuote": "명실론의 위상변화와 대표 학파 간 논쟁",
          "kind": "missing"
        },
        "unconfirmed": [],
        "questionWorthy": true,
        "question": "명실 문제가 어떻게 변화했으며, 그 변화의 시기에 공손룡과 후기 묵가 사이에는 어떤 일이 있었는지 설명해 볼래요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "B-d66848d6-e46d-4314-b9ad-3469076eaa2b-t1-H0-attribution",
        "pointId": "B-d66848d6-e46d-4314-b9ad-3469076eaa2b-t1",
        "arm": "H0",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1",
            "AX2"
          ],
          "unconfirmedAttribution": [],
          "reason": "누락된 중심 관계는 명실 문제의 독립적 철학 주제로의 위상 변화(AX1)와 이를 전문적으로 다룬 공손룡·후기 묵가의 논쟁(AX2)을 함께 연결한다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "명실론이 정치·윤리적 차원에서 다뤄지던 것에서 위상이 변화했으며, 대표 학파들 사이에 논쟁이 있었다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "명실 문제가 독립적인 철학적 주제로 정립되었다는 변화의 구체적 방향",
          "논쟁의 대표 주체가 공손룡과 후기 묵가라는 점"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "medium"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "unresolved/resolved",
      "effectiveCell": "unresolved/resolved",
      "reviewFlag": false
    }
  }
}
```

## R009 / B-9a93322d-60de-43f9-8c9e-a5470fa2631a-t1

```json
{
  "pointId": "B-9a93322d-60de-43f9-8c9e-a5470fa2631a-t1",
  "source": "B",
  "stratum": "initial",
  "sessionId": "9a93322d-60de-43f9-8c9e-a5470fa2631a",
  "turn": 1,
  "v4": {
    "overall": "unresolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "UNCLEAR_OK",
        "reason": "두 잉여금의 사용 차이는 확인되지만, 자유로운 용도와 제한된 용도의 대비는 분명히 드러나지 않았습니다."
      },
      {
        "axisId": "AX2",
        "status": "UNCLEAR_SERIOUS",
        "reason": "자본금 운용을 신중히 해야 한다고 했지만, 두 잉여금으로 손실 보전이 안 될 때 자본금을 쓰는 연결과 회사 존립의 위험은 확인되지 않았습니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "durationMs": 46272,
        "usage": {
          "inputTokens": 10041,
          "outputTokens": 1430,
          "cacheWriteTokens": 4441,
          "cacheReadTokens": 5594
        },
        "stages": [
          {
            "stage": "central_story_gate",
            "durationMs": 42853,
            "usage": {
              "inputTokens": 6173,
              "outputTokens": 1208,
              "cacheWriteTokens": 576,
              "cacheReadTokens": 5594
            }
          },
          {
            "stage": "selective_feedback",
            "durationMs": 3419,
            "usage": {
              "inputTokens": 3868,
              "outputTokens": 222,
              "cacheWriteTokens": 3865
            }
          }
        ]
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "자본금은 주식 발행으로 조달된 기초 자산이어서 감액이 금지된다.",
          "이익 잉여금은 영업 이익에서 생기며 배당금 지급과 손실 보전에 활용될 수 있다.",
          "자본 잉여금은 자본 거래에서 생긴 이익으로 손실 보전에 사용할 수 있으나 배당금으로 지급할 수 없다.",
          "자본금은 매우 신중하게 운용해야 한다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "누적 적자를 이익 잉여금과 자본 잉여금으로 보전할 수 없을 때 자본금을 사용하게 되는 순서와 조건",
          "자본금 감소가 회사의 존립을 위태롭게 할 수 있기 때문에 신중한 운용이 필요하다는 이유"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "unresolved/resolved",
      "effectiveCell": "unresolved/resolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "자본금은 주식 발행으로 조달되는 기초 자산이므로 감액이 금지된다.",
          "이익 잉여금은 영업 이익에서 생기며 배당이나 손실 보전에 사용할 수 있다.",
          "자본 잉여금은 자본 거래 이익으로, 손실 보전에 사용할 수 있지만 배당금으로는 지급할 수 없다.",
          "자본금은 신중하게 운용해야 한다."
        ],
        "brokenRelation": {
          "description": "이익 잉여금과 자본 잉여금으로 손실을 보전할 수 없을 때에만 자본금을 사용하며, 그 감소가 회사 존립을 위태롭게 할 수 있어 신중해야 한다는 핵심 조건·인과 관계가 빠졌다.",
          "studentQuote": null,
          "kind": "missing"
        },
        "unconfirmed": [
          "이익 잉여금은 사업 투자 등에도 비교적 자유롭게 활용될 수 있다는 점",
          "자본 잉여금의 사용 목적은 손실 보전 등 제한된 목적이라는 점"
        ],
        "questionWorthy": true,
        "question": "이익 잉여금과 자본 잉여금으로도 손실을 보전할 수 없을 때 자본금은 어떻게 되며, 왜 신중해야 하나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "B-9a93322d-60de-43f9-8c9e-a5470fa2631a-t1-H1-attribution",
        "pointId": "B-9a93322d-60de-43f9-8c9e-a5470fa2631a-t1",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX2"
          ],
          "unconfirmedAttribution": [
            [
              "AX1"
            ],
            [
              "AX1"
            ]
          ],
          "reason": "누락된 조건·인과 관계는 잉여금으로 손실 보전이 불가능할 때 자본금을 사용하고 그 위험 때문에 신중해야 한다는 AX2에 해당한다. 확인되지 않은 두 내용은 각각 이익 잉여금과 자본 잉여금의 용도 차이에 관한 AX1에 연결된다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R010 / A-N31

```json
{
  "pointId": "A-N31",
  "source": "A",
  "stratum": "initial",
  "sessionId": "6b90cd15-6b86-479b-9a71-8eca0a1816a1",
  "turn": 1,
  "v4": {
    "overall": "unresolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "UNCLEAR_SERIOUS",
        "reason": "라플라스 식과 기포 합체의 소재만 언급되었고, 기포 사이의 공기 이동 및 더 큰 단일 기포 형성의 연결은 드러나지 않았다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N31-v4",
        "durationMs": 6145.914496000012,
        "costUsd": 0.008284799999999998,
        "usage": {
          "input_tokens": 5821,
          "input_tokens_details": {
            "cache_write_tokens": 224,
            "cached_tokens": 5594
          },
          "output_tokens": 550,
          "output_tokens_details": {
            "reasoning_tokens": 146
          },
          "total_tokens": 6371
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "라플라스 식이 기포들이 합쳐지는 경우에 적용된다는 점"
        ],
        "brokenRelation": {
          "description": "크기가 다른 두 기포가 접해 합쳐질 때 한쪽에서 다른 쪽으로 공기가 이동하고, 그 결과 기존 기포들보다 큰 하나의 기포가 만들어진다는 핵심 관계가 제시되지 않았다.",
          "studentQuote": "라플라스 식의 적용 2: 기포가 합쳐질때",
          "kind": "missing"
        },
        "unconfirmed": [],
        "questionWorthy": true,
        "question": "크기가 다른 두 기포가 합쳐질 때 공기는 어떻게 이동하며, 그 결과 어떤 기포가 만들어지나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N31-H0-attribution",
        "pointId": "A-N31",
        "arm": "H0",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1"
          ],
          "unconfirmedAttribution": [],
          "reason": "누락된 공기 이동과 더 큰 단일 기포 형성의 인과 관계는 라플라스 식을 서로 다른 크기의 두 기포의 합체에 적용하는 AX1의 핵심 내용이다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "라플라스 식이 기포가 합쳐지는 상황에 적용된다는 점"
        ],
        "brokenRelation": {
          "description": "크기가 다른 두 기포가 합쳐질 때 기포 사이에서 공기가 이동하고, 그 결과 더 큰 하나의 기포가 형성된다는 중심 관계가 빠졌다.",
          "studentQuote": null,
          "kind": "missing"
        },
        "unconfirmed": [],
        "questionWorthy": true,
        "question": "크기가 다른 두 기포가 하나로 합쳐질 때, 공기의 이동과 최종적으로 만들어지는 기포의 관계를 설명해 볼래?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N31-H1-attribution",
        "pointId": "A-N31",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1"
          ],
          "unconfirmedAttribution": [],
          "reason": "누락된 기포 사이 공기 이동과 더 큰 단일 기포 형성의 인과관계는 AX1이 직접 다루는 핵심 적용 관계에 해당한다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R011 / A-N33

```json
{
  "pointId": "A-N33",
  "source": "A",
  "stratum": "initial",
  "sessionId": "133cfc71-3f44-4497-b131-0ffe2e54da3f",
  "turn": 1,
  "v4": {
    "overall": "unresolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "ERROR",
        "reason": "분사된 잉크를 ‘공기방울’이라고 표현했지만, 여기서 구형 방울은 잉크 방울이다."
      }
    ],
    "errorClaims": [
      {
        "axisId": "AX1",
        "claimIndex": 1,
        "description": "분사된 대상인 잉크를 공기방울이라고 잘못 표현했다.",
        "evidence": "분사 잉크는 공기방울",
        "source": "initial",
        "responseIndex": 0
      }
    ],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N33-v4",
        "durationMs": 5403.3182199999865,
        "costUsd": 0.0093233,
        "usage": {
          "input_tokens": 5862,
          "input_tokens_details": {
            "cache_write_tokens": 265,
            "cached_tokens": 5594
          },
          "output_tokens": 628,
          "output_tokens_details": {
            "reasoning_tokens": 0
          },
          "total_tokens": 6490
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "잉크젯 프린터에서 잉크가 분사된다.",
          "방울의 내부 압력이 외부 압력보다 높다."
        ],
        "brokenRelation": {
          "description": "분사된 잉크는 공기 중에서 잉크 방울을 이루는 것이지, 공기방울이 되는 것은 아니다.",
          "studentQuote": "라플라스 적용 3: 잉크젯 프린터. 분사 잉크는 공기방울. 내부압력이 외부압력보다 높음.",
          "kind": "incorrect"
        },
        "unconfirmed": [
          "잉크 방울이 종이에 도달한다는 과정"
        ],
        "questionWorthy": true,
        "question": "노즐에서 분사된 잉크는 공기 중에서 무엇의 형태가 되나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N33-H0-attribution",
        "pointId": "A-N33",
        "arm": "H0",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1"
          ],
          "unconfirmedAttribution": [
            [
              "AX1"
            ]
          ],
          "reason": "분사 잉크 방울의 정체와 그 내부·외부 압력 관계는 잉크젯의 구형 잉크 방울에 라플라스 식을 적용하는 중심축에 해당한다. 잉크 방울의 종이 도달 과정도 같은 잉크젯 사례 축에 연결된다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "잉크젯 프린터에서 분사된 잉크 방울에 라플라스 식이 적용되며, 그 내부 압력은 외부 압력보다 높다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "분사된 잉크가 공기 중에서 방울 형태가 되어 종이에 도달한다는 과정"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "unresolved/resolved",
      "effectiveCell": "unresolved/resolved",
      "reviewFlag": true
    }
  }
}
```

## R012 / A-N16

```json
{
  "pointId": "A-N16",
  "source": "A",
  "stratum": "initial",
  "sessionId": "0e13f2a0-2987-433a-ad0a-0331dfaaca56",
  "turn": 1,
  "v4": {
    "overall": "unresolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "UNCLEAR_OK",
        "reason": "비영리성과 재단 법인이라는 점은 확인되었지만, 법인격의 귀속은 아직 드러나지 않았습니다."
      },
      {
        "axisId": "AX2",
        "status": "ERROR",
        "reason": "수익 추구 관련 결정도 기관 허가가 필요하다고 했지만, 원문은 수익 활동 실적의 보고를 제시합니다."
      },
      {
        "axisId": "AX3",
        "status": "UNCLEAR_SERIOUS",
        "reason": "수익 추구라는 소재는 언급했지만, 그것이 목적 사업 재원 마련을 위한 제한적 활동이라는 중심 관계는 확인되지 않았습니다."
      }
    ],
    "errorClaims": [
      {
        "axisId": "AX2",
        "claimIndex": 3,
        "description": "수익 추구 관련 결정까지 기관 허가가 필요하다고 한 부분은 원문의 통제 방식과 다릅니다.",
        "evidence": "수익 추구 등에 대한 결정은 기관 허가가 필요",
        "source": "initial",
        "responseIndex": 0
      }
    ],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N16-v4",
        "durationMs": 13801.020690999998,
        "costUsd": 0.0203623,
        "usage": {
          "input_tokens": 6116,
          "input_tokens_details": {
            "cache_write_tokens": 519,
            "cached_tokens": 5594
          },
          "output_tokens": 1495,
          "output_tokens_details": {
            "reasoning_tokens": 516
          },
          "total_tokens": 7611
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "법인의 종류에 따라 자산 운용에 대한 법적 통제 내용이 다르다.",
          "장학 재단은 비영리 법인이자 재단 법인이다.",
          "장학 재단에서는 이사회가 자산 운용을 담당한다.",
          "기본 재산의 처분과 수익 추구 관련 결정에는 관할 기관의 허가가 필요하다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "장학 재단이 비영리 법인이므로 경제적 이익 자체를 추구하지 않는다는 점",
          "재단 법인은 법인격이 자산 자체에 부여된다는 점",
          "수익 추구는 목적 사업 재원을 마련하기 위한 범위에서만 가능하며 운용 실적을 보고해야 한다는 점"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "unresolved/resolved",
      "effectiveCell": "unresolved/resolved",
      "reviewFlag": true
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "법인 종류에 따라 자산 운용에 대한 법적 통제 내용이 다르다.",
          "장학 재단은 비영리 재단 법인이다.",
          "장학 재단에서는 이사회가 자산 운용을 맡는다.",
          "기본 재산의 처분에는 관할 기관의 허가가 필요하다."
        ],
        "brokenRelation": {
          "description": "기본 재산 외 자산으로 수익을 추구하는 활동은 관할 기관의 사전 허가 사항으로 제시되지 않았다. 목적 사업 재원 마련을 위해 일정 범위에서만 허용되고 운용 실적을 보고해야 하는 활동인데, 학생은 이를 기관 허가가 필요한 결정으로 묶었다.",
          "studentQuote": "기본 재산 처분, 수익 추구 등에 대한 결정은 기관 허가가 필요.",
          "kind": "incorrect"
        },
        "unconfirmed": [
          "재단 법인은 자산 자체에 법인격이 부여된다는 점",
          "이사회는 결정권자가 아니며 주요 사항은 관할 기관의 허가를 받아야 한다는 점",
          "기본 재산 외 자산의 수익 활동은 목적 사업 재원 마련을 위한 제한적 활동이며 운용 실적 보고가 필요하다는 점"
        ],
        "questionWorthy": true,
        "question": "기본 재산 외 자산으로 수익을 추구할 때, 관할 기관의 사전 허가가 필요한지와 그 활동에 붙는 다른 제한은 무엇인지 구분해 설명해 볼래?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N16-H1-attribution",
        "pointId": "A-N16",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX2",
            "AX3"
          ],
          "unconfirmedAttribution": [
            [
              "AX1"
            ],
            [
              "AX2"
            ],
            [
              "AX3"
            ]
          ],
          "reason": "문제는 기관 허가의 적용 범위를 기본 재산 처분에서 수익 활동까지 확장한 것으로, 허가 통제의 축(AX2)과 제한적 수익 활동의 성격·보고 의무 축(AX3)에 걸친다. 확인되지 않은 의미들은 각각 재단 법인의 성격, 이사회·허가 통제, 수익 활동의 제한과 보고에 대응한다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R013 / B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t2

```json
{
  "pointId": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t2",
  "source": "B",
  "stratum": "followup",
  "sessionId": "222e04c0-dd5b-49f0-ac64-5e14721696b2",
  "turn": 2,
  "v4": {
    "overall": "unresolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "PASS",
        "reason": "외연의 크기가 구분 기준이라고 직접 밝혔다."
      },
      {
        "axisId": "AX2",
        "status": "UNCLEAR_SERIOUS",
        "reason": "유명이 상황에 따라 한 개체만 지시하는 사명으로 쓰일 수 있다는 핵심 관계에 관한 학생 표현이 없다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "durationMs": 15307,
        "usage": {
          "inputTokens": 9909,
          "outputTokens": 1028,
          "cacheWriteTokens": 1867,
          "cacheReadTokens": 8036
        },
        "stages": [
          {
            "stage": "central_story_gate",
            "durationMs": 7202,
            "usage": {
              "inputTokens": 6328,
              "outputTokens": 589,
              "cacheWriteTokens": 731,
              "cacheReadTokens": 5594
            }
          },
          {
            "stage": "selective_feedback",
            "durationMs": 8105,
            "usage": {
              "inputTokens": 3581,
              "outputTokens": 439,
              "cacheWriteTokens": 1136,
              "cacheReadTokens": 2442
            }
          }
        ]
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "후기 묵가는 명을 달명·유명·사명으로 구분한다.",
          "이 구분은 외연의 크기와 관련된다."
        ],
        "brokenRelation": {
          "description": "외연의 크기에 따라 달명·유명·사명이 각각 무엇을 지시하는지, 특히 같은 명도 대응 대상의 수와 사용 상황에 따라 유명 또는 사명이 될 수 있다는 핵심 관계가 설명되지 않았다.",
          "studentQuote": "외연의 크기에 따라",
          "kind": "missing"
        },
        "unconfirmed": [
          "달명은 천지 만물 전체를 지시한다.",
          "유명은 공통 속성을 지닌 여러 대상을 지시한다.",
          "사명은 하나의 대상만 지시하며, 유명을 특정 개체에 한정해 사용하면 사명이 될 수 있다.",
          "후기 묵가의 이러한 명 구분이 명과 실의 엄격한 일대일 대응을 부정하는 입장과 연결된다."
        ],
        "questionWorthy": true,
        "question": "달명·유명·사명은 각각 가리키는 대상의 수나 범위가 어떻게 다르며, ‘새’라는 명은 어떤 경우에 유명과 사명 중 어느 것이 되나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t2-H0-attribution",
        "pointId": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t2",
        "arm": "H0",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1",
            "AX2"
          ],
          "unconfirmedAttribution": [
            [
              "AX1"
            ],
            [
              "AX1"
            ],
            [
              "AX1",
              "AX2"
            ],
            []
          ],
          "reason": "핵심 문제는 명의 외연 크기에 따른 달명·유명·사명의 구분(AX1)과, 동일한 유명이 사용 상황에 따라 사명이 되는 관계(AX2)에 관한 것이다. 명 구분과 일대일 대응 부정의 연결은 제시된 중심축에 직접 포함되지 않는다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "후기 묵가의 명에는 달명·유명·사명이 존재한다.",
          "달명·유명·사명의 구분은 지시 대상의 외연 크기와 관련된다."
        ],
        "brokenRelation": {
          "description": "유명은 언제나 같은 종류로 고정되는 것이 아니라, 대응 대상이 하나인지 둘 이상인지에 따라 한 개체만 가리키는 사명으로 사용될 수도 있다는 상황적 관계가 빠졌다.",
          "studentQuote": null,
          "kind": "missing"
        },
        "unconfirmed": [
          "달명은 천지 만물을 총괄해 지시한다.",
          "유명은 공통 속성을 가진 여러 사물을 지시한다.",
          "사명은 하나의 대상만 지시한다."
        ],
        "questionWorthy": true,
        "question": "‘새’처럼 원래 여러 대상을 가리킬 수 있는 유명이 어떤 경우에는 사명이 될 수 있는지 설명해 볼래요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t2-H1-attribution",
        "pointId": "B-222e04c0-dd5b-49f0-ac64-5e14721696b2-t2",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX2"
          ],
          "unconfirmedAttribution": [
            [
              "AX1"
            ],
            [
              "AX1"
            ],
            [
              "AX1"
            ]
          ],
          "reason": "누락된 상황적 전환, 즉 유명이 단일 개체를 지시할 때 사명으로 사용될 수 있다는 관계는 AX2에 해당한다. 확인되지 않은 달명·유명·사명의 지시 범위 설명은 모두 외연 크기에 따른 구분인 AX1에 연결된다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R014 / B-b5f6712f-3cbf-4c81-a181-ab40bd7751ab-t1

```json
{
  "pointId": "B-b5f6712f-3cbf-4c81-a181-ab40bd7751ab-t1",
  "source": "B",
  "stratum": "initial",
  "sessionId": "b5f6712f-3cbf-4c81-a181-ab40bd7751ab",
  "turn": 1,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "PASS",
        "reason": "법인의 자산상 권리 주체성, 권한 있는 사람의 실제 운용, 법적 통제라는 중심 관계가 확인됩니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "durationMs": 9226,
        "usage": {
          "inputTokens": 6025,
          "outputTokens": 632,
          "cacheWriteTokens": 6022,
          "cacheReadTokens": 0
        },
        "stages": [
          {
            "stage": "central_story_gate",
            "durationMs": 9226,
            "usage": {
              "inputTokens": 6025,
              "outputTokens": 632,
              "cacheWriteTokens": 6022
            }
          }
        ]
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "법인은 권리와 의무의 주체로서 자산을 운용하고 자산의 소유권을 가진다.",
          "법인이 직접 행위할 수 없으므로 실제 자산 운용은 권한 있는 사람이 한다.",
          "자산 운용은 질서 유지를 위해 통제될 필요가 있다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "법인격의 부여 대상과 경제적 이익 추구 여부에 따른 법인 분류",
          "정해진 절차를 어기거나 법인 목적과 다르게 자산을 운용하면 처벌될 수 있다는 조건"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "법인은 권리와 의무의 주체로서 자산과 관련된다.",
          "실제 자산 운용은 권한 있는 사람이 한다.",
          "자산 운용은 질서 유지를 위해 통제가 필요하다."
        ],
        "brokenRelation": {
          "description": "개인의 출자로 형성된 자산이라도 소유권은 출자한 개인이 아니라 법인에 귀속된다는 핵심 관계가 확인되지 않는다.",
          "studentQuote": "법인은 권리와 의무의 주체로 자산 운용, 자산의 소유권.",
          "kind": "missing"
        },
        "unconfirmed": [
          "법인이 행위 능력이 없기 때문에 권한을 부여받은 사람이 실제 운용을 맡는다는 이유 관계",
          "절차를 어기거나 법인 목적과 다르게 운용하면 법적 처벌을 받을 수 있다는 점"
        ],
        "questionWorthy": true,
        "question": "개인이 출자해 형성한 법인 자산의 소유권은 누구에게 귀속되나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "B-b5f6712f-3cbf-4c81-a181-ab40bd7751ab-t1-H1-attribution",
        "pointId": "B-b5f6712f-3cbf-4c81-a181-ab40bd7751ab-t1",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1"
          ],
          "unconfirmedAttribution": [
            [
              "AX1"
            ],
            [
              "AX1"
            ]
          ],
          "reason": "출자자 개인과 법인의 자산 소유권 귀속을 구별하는 관계는 법인이 독립된 자산 소유 주체라는 AX1에 해당한다. 실제 운용 주체의 권한 및 목적·절차 위반에 대한 법적 통제 역시 AX1의 운용과 통제 내용에 연결된다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "resolved/unresolved",
      "effectiveCell": "resolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R015 / B-81557ccb-623c-4bf9-9a7f-9102d7d6998d-t2

```json
{
  "pointId": "B-81557ccb-623c-4bf9-9a7f-9102d7d6998d-t2",
  "source": "B",
  "stratum": "followup",
  "sessionId": "81557ccb-623c-4bf9-9a7f-9102d7d6998d",
  "turn": 2,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "PASS",
        "reason": "물에서 실이 분화되고 명이 실을 가리키는 관계가 확인됩니다."
      },
      {
        "axisId": "AX2",
        "status": "UNCLEAR_OK",
        "reason": "대응의 필요성은 언급했지만, 축에서 말한 엄격한 일대일 대응 관계는 아직 분명하지 않습니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "durationMs": 11804,
        "usage": {
          "inputTokens": 6426,
          "outputTokens": 884,
          "cacheWriteTokens": 829,
          "cacheReadTokens": 5594
        },
        "stages": [
          {
            "stage": "central_story_gate",
            "durationMs": 11804,
            "usage": {
              "inputTokens": 6426,
              "outputTokens": 884,
              "cacheWriteTokens": 829,
              "cacheReadTokens": 5594
            }
          }
        ]
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "‘물’에서 ‘실’인 개별 사물이 분화된다.",
          "인간이 실에 명을 부여하며, 이것이 소통과 관련된다.",
          "명과 실은 잘 대응되어야 한다."
        ],
        "brokenRelation": {
          "description": "공손룡이 주장한 엄격한 일대일 대응, 즉 각 실은 하나의 명으로만 지시되고 각 명도 하나의 실만 지시되어야 혼란을 막을 수 있다는 관계가 확인되지 않는다.",
          "studentQuote": "잘 대응되어야 함.",
          "kind": "missing"
        },
        "unconfirmed": [
          "서로 다른 실에 같은 명을 쓰면 대상 구별이 사라져 소통의 혼란이 생긴다는 이유"
        ],
        "questionWorthy": true,
        "question": "공손룡이 말한 명과 실의 ‘잘 대응’은 하나의 명과 하나의 실이 구체적으로 어떤 방식으로 대응해야 한다는 뜻인가요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "B-81557ccb-623c-4bf9-9a7f-9102d7d6998d-t2-H0-attribution",
        "pointId": "B-81557ccb-623c-4bf9-9a7f-9102d7d6998d-t2",
        "arm": "H0",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX2"
          ],
          "unconfirmedAttribution": [
            [
              "AX2"
            ]
          ],
          "reason": "엄격한 명·실의 일대일 대응과, 동일한 명이 서로 다른 실을 가리킬 때 발생하는 구별·소통의 혼란은 모두 명이 실을 구별하고 소통을 가능하게 한다는 AX2에 해당한다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "resolved/unresolved",
      "effectiveCell": "resolved/unresolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "분화되지 않은 천지만물인 ‘물’에서 개별 사물인 ‘실’이 나온다.",
          "인간은 실에 명을 부여하며, 명은 소통과 관련된다."
        ],
        "brokenRelation": {
          "description": "공손룡이 혼란 없는 구별과 소통을 위해 주장한 명과 실의 엄격한 일대일 대응 관계가 확인되지 않는다.",
          "studentQuote": "잘 대응되어야 함.",
          "kind": "missing"
        },
        "unconfirmed": [
          "명은 인간과 무관하게 분화된 실들의 차이를 구별·확정한다.",
          "하나의 명이 여러 실을, 하나의 실이 여러 명을 지시하면 혼란이 생긴다는 관계"
        ],
        "questionWorthy": true,
        "question": "공손룡이 말한 명과 실의 ‘잘 대응’은 한 명이 여러 실을 가리켜도 되는 관계인가요, 아니면 어떤 대응 관계인가요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "B-81557ccb-623c-4bf9-9a7f-9102d7d6998d-t2-H1-attribution",
        "pointId": "B-81557ccb-623c-4bf9-9a7f-9102d7d6998d-t2",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX2"
          ],
          "unconfirmedAttribution": [
            [
              "AX2"
            ],
            [
              "AX2"
            ]
          ],
          "reason": "확인되지 않은 핵심 관계와 두 미확인 의미 모두 명이 실을 구별·지시하여 소통을 가능하게 하고, 혼란을 막기 위해 일대일 대응해야 한다는 AX2에 해당한다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "resolved/unresolved",
      "effectiveCell": "resolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R016 / A-N14

```json
{
  "pointId": "A-N14",
  "source": "A",
  "stratum": "followup",
  "sessionId": "99447c63-8aa1-469a-a21d-5efa4cd34e3b",
  "turn": 2,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "UNCLEAR_OK",
        "reason": "소유권 귀속은 확인됐지만, 실제 운용 주체와 법적 통제의 관계는 아직 분명하지 않습니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N14-v4",
        "durationMs": 8244.61196200001,
        "costUsd": 0.011242299999999998,
        "usage": {
          "input_tokens": 6068,
          "input_tokens_details": {
            "cache_write_tokens": 471,
            "cached_tokens": 5594
          },
          "output_tokens": 745,
          "output_tokens_details": {
            "reasoning_tokens": 209
          },
          "total_tokens": 6813
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "개인의 출자로 형성된 법인 자산의 소유권은 법인에 귀속된다."
        ],
        "brokenRelation": {
          "description": "법인은 행위 능력이 없으므로 실제 자산 운용은 정관이나 법령에 따라 권한을 받은 사람이 한다는 핵심 관계가 제시되지 않았다.",
          "studentQuote": "법인의 정의와 종류. 자산의 소유와 운용 권리. 법적 통제.",
          "kind": "missing"
        },
        "unconfirmed": [
          "법인격 부여 대상과 경제적 이익 추구 여부에 따른 법인의 분류",
          "정해진 절차나 법인의 목적에 어긋나는 자산 운용은 처벌될 수 있다는 점",
          "자산 운용의 법적 통제가 자율성과 책임의 균형 및 공동체 질서 유지를 위한 것이라는 점"
        ],
        "questionWorthy": true,
        "question": "법인은 행위 능력이 없는데, 실제 자산 운용은 누가 어떤 근거로 할 수 있나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N14-H0-attribution",
        "pointId": "A-N14",
        "arm": "H0",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1"
          ],
          "unconfirmedAttribution": [
            [],
            [
              "AX1"
            ],
            [
              "AX1"
            ]
          ],
          "reason": "누락된 실제 운용 주체와 권한 부여 관계는 AX1의 핵심 내용에 해당한다. 절차·목적 위반 시 처벌 및 법적 통제의 목적도 AX1의 법적 통제 측면과 연결되며, 법인 분류는 이 축에 직접 포함되지 않는다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "resolved/unresolved",
      "effectiveCell": "resolved/unresolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "개인의 출자로 형성된 자산도 법인 소유이다."
        ],
        "brokenRelation": {
          "description": "법인이 자산의 소유 주체이지만 행위 능력이 없어 실제 운용은 정관이나 법령에 따라 권한을 받은 사람이 하며 법적 통제를 받는다는 중심 연결이 드러나지 않았다.",
          "studentQuote": "법인의 정의와 종류. 자산의 소유와 운용 권리. 법적 통제.",
          "kind": "inter-axis-relation"
        },
        "unconfirmed": [
          "법인격 부여 대상과 경제적 이익 추구 여부에 따른 법인 분류",
          "절차나 법인 목적에 어긋난 자산 운용이 처벌될 수 있다는 점",
          "법적 통제의 목적이 자율성과 책임의 균형 및 공동체 질서 유지라는 점"
        ],
        "questionWorthy": true,
        "question": "법인이 자산을 소유할 수 있는데도 실제 자산 운용은 누가, 어떤 근거로 하며 왜 법적 통제를 받는지 설명해 보세요.",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N14-H1-attribution",
        "pointId": "A-N14",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1"
          ],
          "unconfirmedAttribution": [
            [],
            [
              "AX1"
            ],
            [
              "AX1"
            ]
          ],
          "reason": "핵심 누락은 법인이 자산의 권리 주체인 것과 권한을 받은 사람이 실제 운용하며 통제받는다는 연결로, AX1에 직접 해당한다. 절차·목적 위반에 대한 처벌과 법적 통제의 목적도 AX1의 법적 통제 측면에 연결되지만, 법인 분류는 이 중심축에 직접 포함되지 않는다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "resolved/unresolved",
      "effectiveCell": "resolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R017 / A-N27

```json
{
  "pointId": "A-N27",
  "source": "A",
  "stratum": "initial",
  "sessionId": "0b7c68af-3559-4f10-a636-32d1d141940c",
  "turn": 1,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "UNCLEAR_OK",
        "reason": "다수 의견의 위헌 판단은 확인되었지만, 소수 의견의 자율 교정 가능성 판단과 정부 개입을 둘러싼 대립은 아직 분명하지 않다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N27-v4",
        "durationMs": 7771.393305000005,
        "costUsd": 0.0108968,
        "usage": {
          "input_tokens": 5925,
          "input_tokens_details": {
            "cache_write_tokens": 328,
            "cached_tokens": 5594
          },
          "output_tokens": 746,
          "output_tokens_details": {
            "reasoning_tokens": 126
          },
          "total_tokens": 6671
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "헌법재판소의 실명확인 사건에서 인터넷 언론사 제재 규정의 위헌 여부가 쟁점이 되었다.",
          "다수 의견은 해당 규정이 위헌이라고 보았다.",
          "소수 의견은 비판론과 같은 취지의 입장이었다."
        ],
        "brokenRelation": {
          "description": "소수 의견이 허위·왜곡 정보는 토론 같은 자율적 방법만으로 교정되기 어렵다고 보았다는 핵심 근거가 빠져, 다수 의견과 소수 의견이 정부 개입 여부에서 왜 갈리는지 재구성되지 않는다.",
          "studentQuote": "소수 의견은 비판론 취지.",
          "kind": "missing"
        },
        "unconfirmed": [],
        "questionWorthy": true,
        "question": "소수 의견은 허위·왜곡 정보를 토론 등 자율적 방법으로 교정할 수 있다고 보았나요, 어렵다고 보았나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N27-H0-attribution",
        "pointId": "A-N27",
        "arm": "H0",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1"
          ],
          "unconfirmedAttribution": [],
          "reason": "누락된 소수 의견의 핵심 근거는 허위·왜곡 정보의 자율 교정 가능성과 이에 따른 정부 개입 필요성에 관한 대립을 다루므로 AX1에 해당한다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "resolved/unresolved",
      "effectiveCell": "resolved/unresolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "헌법재판소의 실명확인 사건에서 인터넷 언론사 제재 규정의 위헌 여부가 쟁점이 되었다.",
          "다수 의견은 해당 규정이 위헌이라고 보았고, 소수 의견은 비판론과 같은 취지의 입장이었다."
        ],
        "brokenRelation": {
          "description": "소수 의견이 허위·왜곡 정보는 토론 같은 자율적 방법으로 교정되기 어렵다고 보았다는 핵심 근거가 빠져, 다수 의견과 소수 의견이 정부 개입을 두고 왜 대립하는지 재구성하기 어렵다.",
          "studentQuote": "소수 의견은 비판론 취지.",
          "kind": "missing"
        },
        "unconfirmed": [],
        "questionWorthy": true,
        "question": "소수 의견은 허위·왜곡 정보가 자율적인 토론으로 교정될 수 있는지에 대해 어떻게 보았나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N27-H1-attribution",
        "pointId": "A-N27",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1"
          ],
          "unconfirmedAttribution": [],
          "reason": "누락된 소수 의견의 핵심 근거는 허위·왜곡 정보의 자율 교정 가능성과 정부 개입 필요성을 둘러싼 다수·소수 의견의 대립을 설명하므로 AX1에 해당한다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "resolved/unresolved",
      "effectiveCell": "resolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R018 / A-N17

```json
{
  "pointId": "A-N17",
  "source": "A",
  "stratum": "followup",
  "sessionId": "0e13f2a0-2987-433a-ad0a-0331dfaaca56",
  "turn": 2,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "UNCLEAR_OK",
        "reason": "비영리 재단 법인이라는 점은 설명했지만, 법인격의 귀속은 아직 드러나지 않았습니다."
      },
      {
        "axisId": "AX2",
        "status": "UNCLEAR_OK",
        "reason": "기본 재산 처분의 허가 통제는 확인되었지만, 이사회가 행위 능력을 대신한다는 역할과 주요 사항의 허가 통제는 충분히 확인되지 않았습니다."
      },
      {
        "axisId": "AX3",
        "status": "PASS",
        "reason": "수익 활동의 목적과 제한적 성격이 확인되었습니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N17-v4",
        "durationMs": 19445.21179599999,
        "costUsd": 0.0255733,
        "usage": {
          "input_tokens": 6218,
          "input_tokens_details": {
            "cache_write_tokens": 621,
            "cached_tokens": 5594
          },
          "output_tokens": 1908,
          "output_tokens_details": {
            "reasoning_tokens": 832
          },
          "total_tokens": 8126
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "법인 종류에 따라 자산 운용에 대한 법적 통제의 구체적 내용이 다르다.",
          "장학 재단은 비영리 재단 법인으로서 이사회가 자산 운용을 담당한다.",
          "기본 재산의 처분에는 관할 기관의 허가가 필요하다.",
          "기본 재산 외 자산의 수익 추구는 목적 사업의 재원을 마련하기 위한 것이며, 운용 실적을 보고해야 한다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "재단 법인의 이사회는 독자적 결정권자가 아니고 주요 사항은 관할 기관의 허가를 받아야 한다는 점",
          "수익 활동은 일정 범위 내에서만 가능하다는 제한"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "법인 종류에 따라 자산 운용에 대한 법적 통제의 내용이 다르다.",
          "장학 재단은 비영리 재단 법인이다.",
          "이사회가 자산 운용을 대신한다.",
          "기본 재산의 처분에는 관할 기관의 허가가 필요하다.",
          "기본 재산 외 자산의 수익 추구는 목적 사업의 재원을 마련하기 위한 것이며, 운용 실적을 보고해야 한다."
        ],
        "brokenRelation": {
          "description": "기본 재산 외 자산으로 수익을 추구하는 활동은 관할 기관의 허가 대상이라고 했지만, 본문은 목적 사업 재원 마련을 위해 일정 범위에서 허용하고 운용 실적을 보고하도록 한다.",
          "studentQuote": "기본 재산 처분, 수익 추구 등에 대한 결정은 기관 허가가 필요.",
          "kind": "incorrect"
        },
        "unconfirmed": [
          "이사회는 재단 법인의 결정권자가 아니라 행위 능력을 대신 행사하는 기구라는 점",
          "기본 재산 외 자산의 수익 활동은 일정 범위 내에서만 가능하다는 점"
        ],
        "questionWorthy": true,
        "question": "기본 재산 외 자산으로 수익을 추구할 때, 관할 기관에는 허가를 받아야 하나요, 아니면 어떤 방식의 통제를 받나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N17-H1-attribution",
        "pointId": "A-N17",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX3"
          ],
          "unconfirmedAttribution": [
            [
              "AX2"
            ],
            [
              "AX3"
            ]
          ],
          "reason": "수익 활동에 기관 허가가 필요하다고 한 오류는 기본 재산 외 자산의 제한적 수익 활동을 다루는 AX3에 해당한다. 이사회의 역할은 AX2, 수익 활동의 범위 제한은 AX3에 연결된다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "resolved/unresolved",
      "effectiveCell": "resolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R019 / A-N20

```json
{
  "pointId": "A-N20",
  "source": "A",
  "stratum": "initial",
  "sessionId": "88804eee-40c0-435e-9aa5-b43d77a82086",
  "turn": 1,
  "v4": {
    "overall": "resolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "PASS",
        "reason": "두 잉여금의 서로 다른 활용 범위를 정확히 설명했습니다."
      },
      {
        "axisId": "AX2",
        "status": "UNCLEAR_OK",
        "reason": "자본금 사용이 두 잉여금으로 손실을 보전하지 못한 경우에 이루어진다는 연결은 아직 드러나지 않았습니다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N20-v4",
        "durationMs": 9151.471152999991,
        "costUsd": 0.0145718,
        "usage": {
          "input_tokens": 6171,
          "input_tokens_details": {
            "cache_write_tokens": 574,
            "cached_tokens": 5594
          },
          "output_tokens": 1001,
          "output_tokens_details": {
            "reasoning_tokens": 90
          },
          "total_tokens": 7172
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "resolved",
      "effectiveOverall": "resolved",
      "retracted": false,
      "raw": {
        "overall": "resolved",
        "understoodRelations": [
          "자본금은 출자금으로 이루어진 기초 자산이어서 감액이 금지되며, 감소하면 회사 존립이 위협받는다.",
          "이익 잉여금은 영업 이익 중 유보된 재원으로 배당·투자·손실 보전 등에 비교적 자유롭게 활용할 수 있다.",
          "자본 잉여금은 자본 거래에서 얻은 이익이며 손실 보전에만 제한적으로 쓸 수 있고 배당금으로 지급할 수 없다."
        ],
        "brokenRelation": null,
        "unconfirmed": [
          "적자가 누적되어 이익 잉여금과 자본 잉여금으로 손실을 보전할 수 없을 때 자본금을 사용하게 된다는 관계"
        ],
        "questionWorthy": false,
        "question": null,
        "confidence": "high"
      },
      "errors": [],
      "attribution": null,
      "rawCell": "resolved/resolved",
      "effectiveCell": "resolved/resolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [
          "자본금은 출자금으로 형성된 기초 자산이라 감액이 금지되고, 감소하면 회사 존립을 위협할 수 있다.",
          "이익 잉여금은 영업 이익 중 유보된 재원으로 배당·투자·손실 보전에 비교적 자유롭게 활용된다.",
          "자본 잉여금은 자본 거래에서 얻은 이익이며 손실 보전에는 사용할 수 있지만 배당금으로 지급할 수 없다."
        ],
        "brokenRelation": {
          "description": "이익 잉여금과 자본 잉여금으로 손실을 보전할 수 없을 때 자본금을 사용하게 되며, 그래서 자본금 감소를 신중히 해야 한다는 조건적 연결이 빠졌다.",
          "studentQuote": "자본금(출자금, 기초 자산->감액 금지, 자본금 감소는 존립 위협)",
          "kind": "inter-axis-relation"
        },
        "unconfirmed": [],
        "questionWorthy": true,
        "question": "이익 잉여금과 자본 잉여금으로 손실을 보전할 수 없을 때에는 자본금이 어떻게 되는지 설명해 볼래?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N20-H1-attribution",
        "pointId": "A-N20",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1",
            "AX2"
          ],
          "unconfirmedAttribution": [],
          "reason": "누적 적자 상황에서 이익·자본 잉여금의 손실 보전 기능이 한계에 이른 뒤 자본금 사용과 존립 위험으로 이어지는 연결이므로, 두 잉여금의 용도 차이(AX1)와 자본금 사용의 조건 및 위험(AX2)을 함께 가로지른다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "resolved/unresolved",
      "effectiveCell": "resolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

## R020 / A-N13

```json
{
  "pointId": "A-N13",
  "source": "A",
  "stratum": "initial",
  "sessionId": "99447c63-8aa1-469a-a21d-5efa4cd34e3b",
  "turn": 1,
  "v4": {
    "overall": "unresolved",
    "axes": [
      {
        "axisId": "AX1",
        "status": "UNCLEAR_SERIOUS",
        "reason": "자산 소유·운용·법적 통제라는 소재만 나열되어, 법인이 소유 주체이고 권한을 받은 사람이 실제 운용을 담당한다는 핵심 관계가 드러나지 않았다."
      }
    ],
    "errorClaims": [],
    "contractError": null,
    "recordedCalls": [
      {
        "id": "N13-v4",
        "durationMs": 4767.882160000008,
        "costUsd": 0.008642799999999999,
        "usage": {
          "input_tokens": 5993,
          "input_tokens_details": {
            "cache_write_tokens": 396,
            "cached_tokens": 5594
          },
          "output_tokens": 544,
          "output_tokens_details": {
            "reasoning_tokens": 62
          },
          "total_tokens": 6537
        }
      }
    ]
  },
  "variants": {
    "H0": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [],
        "brokenRelation": {
          "description": "법인이 자산의 소유 주체이지만 행위 능력이 없어, 실제 운용은 정관이나 법령에 따라 권한을 받은 사람이 하며 그 운용은 법적 통제를 받는다는 중심 관계가 제시되지 않았다.",
          "studentQuote": "법인의 정의와 종류. 자산의 소유와 운용 권리. 법적 통제.",
          "kind": "inter-axis-relation"
        },
        "unconfirmed": [
          "법인격이 개인 출자와 무관하게 자산 소유권을 법인에게 귀속시키는 관계",
          "절차나 법인 목적에 어긋난 자산 운용은 처벌될 수 있다는 점",
          "법적 통제가 자율성과 책임의 균형 및 사회ㆍ경제 공동체 질서 유지를 위한 것이라는 점"
        ],
        "questionWorthy": true,
        "question": "법인은 자산을 소유할 수 있는데도 실제 자산 운용은 누가 어떤 근거로 하며, 그 운용에는 왜 법적 통제가 따르나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N13-H0-attribution",
        "pointId": "A-N13",
        "arm": "H0",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1"
          ],
          "unconfirmedAttribution": [
            [
              "AX1"
            ],
            [
              "AX1"
            ],
            [
              "AX1"
            ]
          ],
          "reason": "누락된 중심 관계는 법인의 자산 소유와 권한 있는 사람의 실제 운용, 그에 대한 법적 통제를 함께 다루므로 AX1에 해당한다. 확인되지 않은 세부 사항들도 모두 자산 귀속·운용 통제 및 그 법적 목적에 관한 AX1의 내용이다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    },
    "H1": {
      "rawOverall": "unresolved",
      "effectiveOverall": "unresolved",
      "retracted": false,
      "raw": {
        "overall": "unresolved",
        "understoodRelations": [],
        "brokenRelation": {
          "description": "법인이 자산의 소유 주체이지만 행위 능력이 없어 실제 운용은 정관이나 법령으로 권한을 받은 사람이 하며 법적 통제를 받는다는 중심 관계가 제시되지 않았다.",
          "studentQuote": "법인의 정의와 종류. 자산의 소유와 운용 권리. 법적 통제.",
          "kind": "missing"
        },
        "unconfirmed": [
          "법인 자산은 개인 출자로 형성되어도 특정 개인이 아니라 법인에 귀속된다는 점",
          "절차나 법인 목적에 어긋난 자산 운용은 처벌될 수 있다는 점"
        ],
        "questionWorthy": true,
        "question": "법인이 자산을 소유할 수 있으면서도 실제 자산 운용은 누가 어떤 근거로 담당하는지 설명해 볼 수 있나요?",
        "confidence": "high"
      },
      "errors": [],
      "attribution": {
        "id": "A-N13-H1-attribution",
        "pointId": "A-N13",
        "arm": "H1",
        "kind": "attribution",
        "raw": {
          "axisAttribution": [
            "AX1"
          ],
          "unconfirmedAttribution": [
            [
              "AX1"
            ],
            [
              "AX1"
            ]
          ],
          "reason": "누락된 중심 관계는 법인의 자산 소유 주체성과 실제 운용 주체·법적 통제의 연결에 관한 것으로 AX1에 해당한다. 확인되지 않은 자산 귀속과 위법 운용의 처벌 역시 모두 이 축의 소유 및 법적 통제 의미와 연결된다."
        },
        "errors": [],
        "validated": null,
        "normalizationEvents": []
      },
      "rawCell": "unresolved/unresolved",
      "effectiveCell": "unresolved/unresolved",
      "reviewFlag": false
    }
  }
}
```

