# 지도 3회차 요약(동결 선택 점검표 v2 참고용). 사용: python3 map_summary.py <id>
import json,sys
D='docs/experiments/set-pattern-2026-11-18/cell3/map/'+sys.argv[1]+'/runs/'
for r in (1,2,3):
    m=json.load(open(D+f'map-r{r}.json')); nodes={n['id']:n for n in m['nodes']}; props={p['id'] for p in m['propositions']}
    print(f'== r{r}: 명제 {len(m["propositions"])}, 노드 {len(m["nodes"])}, 관계 {len(m["relations"])}')
    for n in m['nodes']:
        if n['kind'] in('PARAGRAPH_GIST','TOP','CROSS'): 
            flat=[c for c in n['childIds'] if c in props]
            print(f' {n["id"]} {n["kind"]} 자식 {n["childIds"]}  평평한 명제 {flat}')
    print(' 합성:'); 
    for n in m['nodes']:
        if n['kind']=='COMPOSITE': print(f'  {n["id"]} <- {n["childIds"]} | {n["text"][:70]}')
