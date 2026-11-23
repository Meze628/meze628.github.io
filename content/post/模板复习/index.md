---
title: "模板复习"
description: "模板复习"
date: 2026-03-03T17:06:21+08:00
math: true
categories:
    - 记录（OI与数学）
---

## 图论

### 单源最短路

#### dijkstra

[【模板】单源最短路径（标准版）](https://www.luogu.com.cn/problem/P4779)

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=1e5+5;
ll n,m,s;
ll dis[N],vis[N];
struct edge{
    ll v,w;
};
vector<edge> g[N];
struct node{
    ll dis,u;
    bool operator>(const node &b) const{
        return b.dis<dis;
    }
};
priority_queue<node,vector<node>,greater<node> > q;

void dijkstra(){
    memset(dis,0x3f,sizeof dis);
    memset(vis,0,sizeof vis);
    dis[s]=0;
    q.push((node){0,s});
    while (!q.empty()){
        ll u=q.top().u;
        q.pop();
        if (vis[u]) continue;
        vis[u]=1;
        for (edge ed:g[u]){
            ll v=ed.v,w=ed.w;
            if (dis[v]>dis[u]+w){
                dis[v]=dis[u]+w;
                q.push((node){dis[v],v});
            }
        }
    }
}

int main(){
    scanf("%lld%lld%lld",&n,&m,&s);
    for (int i=1;i<=m;i++){
        ll u,v,w;
        scanf("%lld%lld%lld",&u,&v,&w);
        g[u].push_back((edge){v,w});
    }
    dijkstra();
    for (int i=1;i<=n;i++) printf("%lld ",dis[i]);
    return 0;
}
```


#### spfa

[【模板】单源最短路径（弱化版）](https://www.luogu.com.cn/problem/P3371)

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=1e4+5;
ll n,m,s;
ll inq[N],dis[N];
struct edge{
    ll v,w;
};
vector<edge> g[N];
queue<ll> q;

void spfa(){
    for (int i=1;i<=n;i++) dis[i]=INT_MAX;
    memset(inq,0,sizeof inq);
    q.push(s);
    dis[s]=0;
    inq[s]=1;
    while (!q.empty()){
        ll u=q.front();
        q.pop();
        inq[u]=0;
        for (edge ed:g[u]){
            ll v=ed.v,w=ed.w;
            if (dis[v]>dis[u]+w){
                dis[v]=dis[u]+w;
                if (!inq[v]) inq[v]=1,q.push(v);
            }
        }
    }
}

int main(){
    scanf("%lld%lld%lld",&n,&m,&s);
    for (int i=1;i<=m;i++){
        ll u,v,w;
        scanf("%lld%lld%lld",&u,&v,&w);
        g[u].push_back((edge){v,w});
    }
    spfa();
    for (int i=1;i<=n;i++) printf("%lld ",dis[i]);
    return 0;
}
```

### 最小生成树

[【模板】最小生成树](https://www.luogu.com.cn/problem/P3366)

#### Kruskal

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int M=2e5+5;
ll n,m,p[M],ans,cnt;
struct Edge{
    ll u,v,w;
    bool operator<(const Edge &b) const {
        return w<b.w;
    }
}g[M];

ll find(ll x){
    if (p[x]!=x) p[x]=find(p[x]);
    return p[x];
}

int main(){
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=m;i++){
        ll u,v,w;
        scanf("%lld%lld%lld",&u,&v,&w);
        g[i]=(Edge){u,v,w};
    }
    for (int i=1;i<=n;i++) p[i]=i;
    sort(g+1,g+1+m);
    for (int i=1;i<=m;i++){
        ll u=g[i].u,v=g[i].v,w=g[i].w;
        ll x=find(u),y=find(v);
        if (x!=y) p[x]=y,ans+=w,cnt++;
    }
    if (cnt==n-1) printf("%lld\n",ans);
    else printf("orz");
    return 0;
}
```

#### prim

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=1e4+5;
ll n,m,cnt,ans;
ll vis[N];
struct edge{
    ll v,w;
};
vector<edge> g[N]; 
struct node{
    ll u,dis;
    bool operator>(const node &b) const{
        return b.dis<dis;
    }
};
priority_queue<node,vector<node>,greater<node>> q;

int main(){
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=m;i++){
        ll u,v,w;
        scanf("%lld%lld%lld",&u,&v,&w);
        g[u].push_back((edge){v,w});
        g[v].push_back((edge){u,w});
    }
    q.push((node){1,0});
    while (!q.empty()&&cnt<n){
        ll u=q.top().u,w=q.top().dis;
        q.pop();
        if (vis[u]) continue;
        vis[u]=1;
        ans+=w;
        cnt++;
        for (edge ed:g[u]){
            ll v=ed.v,w=ed.w;
            if (!vis[v]) q.push((node){v,w});
        }
    }
    if (cnt==n) printf("%lld\n",ans);
    else puts("orz");
    return 0;
}
```

### 并查集

[【模板】并查集](https://www.luogu.com.cn/problem/P3367)

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=2e5+5;
ll n,m,p[N];

ll find(ll x){
    if (p[x]!=x) p[x]=find(p[x]);
    return p[x];
}

int main(){
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=n;i++) p[i]=i;
    for (int i=1;i<=m;i++) {
        ll z,x,y;
        scanf("%lld%lld%lld",&z,&x,&y);
        if (z==1) p[find(x)]=find(y);
        if (z==2){
            if (p[find(x)]==p[find(y)]) puts("Y");
            else puts("N");
        }
    }
    return 0;
}
```

### 强连通分量

[[图论与代数结构 701] 强连通分量](https://www.luogu.com.cn/problem/B3609)

#### tarjan

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=1e4+5;
ll n,m,cnt,sc;
vector<ll> g[N],ans[N];
ll dfn[N],ins[N],low[N],scc[N],vis[N];
stack<ll> s;

void tarjan(ll u){
    dfn[u]=low[u]=++cnt;
    s.push(u);
    ins[u]=1;
    for (ll v:g[u]){
        if (!dfn[v]){
            tarjan(v);
            low[u]=min(low[u],low[v]);
        }
        else if (ins[v]) low[u]=min(low[u],dfn[v]);
    }
    if (dfn[u]==low[u]){
        sc++;
        while (s.top()!=u){
            ll v=s.top();
            s.pop();
            scc[v]=sc;
            ins[v]=0;
        }
        scc[u]=sc;
        ins[u]=0;
        s.pop();
    }
}

int main(){
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=m;i++){
        ll u,v;
        scanf("%lld%lld",&u,&v);
        g[u].push_back(v);
    }
    for (int i=1;i<=n;i++){
        if (!dfn[i]) tarjan(i);
    }
    printf("%lld\n",sc);
    for (int i=1;i<=n;i++) ans[scc[i]].push_back(i);
    for (int i=1;i<=n;i++){
        if (vis[scc[i]]) continue;
        vis[scc[i]]=1;
        for (ll res:ans[scc[i]]) printf("%lld ",res);
        putchar('\n');
    }
    return 0;
}
```

### 割点、点双连通分量

#### 割点判定

[【模板】割点](https://www.luogu.com.cn/problem/P3388)

```cpp {class="code-closed"}
#include <bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=2e4+5;
ll n,m;
ll vis[N],dfn[N],low[N],cnt,res,flag[N];
vector<ll> g[N];

void tarjan(ll u,ll fa){
    dfn[u]=low[u]=++cnt;
    ll cnts=0;
    for (ll v:g[u]) {
        if (!dfn[v]){
            cnts++;
            tarjan(v,u);
            low[u]=min(low[u],low[v]);
            if (u!=fa&&low[v]>=dfn[u]&&!flag[u]) flag[u]=1,res++;
        }
        else if (v!=fa) low[u]=min(low[u],dfn[v]);
    }
    if (fa==u&&cnts>=2){
        flag[u]=1;
        res++;
    }
}

int main() {
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=m;i++){
        ll u,v;
        scanf("%lld%lld",&u,&v);
        g[u].push_back(v);
        g[v].push_back(u);
    }
    for (int i=1;i<=n;i++){
        if (!dfn[i]) tarjan(i,i);
    }
    printf("%lld\n",res);
    for (ll i=1;i<=n;i++){
        if (flag[i]) printf("%lld ",i);
    }
    return 0;
}
```

#### 点双连通分量

[【模板】点双连通分量](https://www.luogu.com.cn/problem/P8435)

```cpp {class="code-closed"}
#include <bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=5e5+5,M=2e6+5;
ll n,m;
ll dfn[N],low[N],cnts,cnt,res;
stack<ll> s;
vector<ll> g[N],ans[N];

void tarjan(ll u,ll p){
    dfn[u]=low[u]=++cnt;
    s.push(u);
    if (g[u].empty()){
        ans[++res].push_back(u);
        return ;
    }
    for (ll v:g[u]){
        if (!dfn[v]){
            tarjan(v,u);
            low[u]=min(low[u],low[v]);
            if (low[v]>=dfn[u]){
                ++res;
                ll x;
                do{
                    x=s.top();
                    s.pop();
                    ans[res].push_back(x);
                }while (x!=v);
                ans[res].push_back(u);
            }
        }
        else if (v!=p) low[u]=min(low[u],dfn[v]);
    }
}

int main() {
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=m;i++){
        ll u,v;
        scanf("%lld%lld",&u,&v);
        if (u==v) continue;
        g[u].push_back(v);
        g[v].push_back(u);
    }
    for (int i=1;i<=n;i++){
        if (!dfn[i]){
            while (!s.empty()) s.pop();
            tarjan(i,i);
        }
    }
    printf("%lld\n",res);
    for (int i=1;i<=res;i++){
        printf("%lld ",ans[i].size());
        for (ll v:ans[i]) printf("%lld ",v);
        putchar('\n');
    }
    return 0;
}
```

### 桥、边双连通分量

#### 桥的判断（割边）

[【模板】割边](https://www.luogu.com.cn/problem/U582665)

虽然题目里没有重边，但是代码里考虑重边。

```cpp {class="code-closed"}
#include <bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=5e5+5,M=2e6+5;
ll n,m,dfn[N],low[N],cnt,res,flag[M];
vector<pair<ll,ll>> g[N];

void tarjan(ll u,ll p){
    dfn[u]=low[u]=++cnt;
    for (auto e:g[u]){
        ll v=e.first,id=e.second;
        if (!dfn[v]){
            tarjan(v,id);
            low[u]=min(low[u],low[v]);
            if (low[v]>dfn[u]) flag[id]=1,res++;
        }
        else if (id!=p) low[u]=min(low[u],dfn[v]);
    }
}

int main(){
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=m;i++){
        ll u,v;
        scanf("%lld%lld",&u,&v);
        g[u].push_back({v,i});
        g[v].push_back({u,i});
    }
    for (int i=1;i<=n;i++){
        if (!dfn[i]) tarjan(i,0);
    }
    printf("%lld\n",res);
    for (int i=1;i<=m;i++){
        if (flag[i]) printf("%d ",i);
    }
    printf("\n");
    return 0;
}
```

#### 边双连通分量

[【模板】边双连通分量](https://www.luogu.com.cn/problem/P8436)

```cpp {class="code-closed"}
#include <bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=5e5+5,M=2e6+5;
ll n,m;
ll dfn[N],low[N],cnt,res,flag[M],vis[N];
vector<pair<ll,ll>> g[N];
vector<ll> ans[N];

void tarjan(ll u,ll p){
    dfn[u]=low[u]=++cnt;
    for (auto ed:g[u]){
        ll v=ed.first,id=ed.second;
        if (!dfn[v]){
            tarjan(v,id);
            low[u]=min(low[u],low[v]);
            if (low[v]>dfn[u]) flag[id]=1;
        }
        else if (id!=p) low[u]=min(low[u],dfn[v]);
    }
}

void dfs(ll u){
    vis[u]=1;
    ans[res].push_back(u);
    for (auto ed:g[u]){
        ll v=ed.first,id=ed.second;
        if (vis[v]||flag[id]) continue;
        dfs(v);
    }
}

int main() {
    scanf("%lld%lld",&n,&m);
    for (ll i=1,u,v;i<=m;i++){
        scanf("%lld%lld",&u,&v);
        g[u].push_back({v,i});
        g[v].push_back({u,i});
    }
    for (int i=1;i<=n;i++){
        if (!dfn[i]) tarjan(i,0);
    }
    for (int i=1;i<=n;i++){
        if (!vis[i]){
            res++;
            dfs(i);
        }
    }
    printf("%lld\n",res);
    for (int i=1;i<=res;i++){
        printf("%lld ",ans[i].size());
        for (ll v:ans[i]) printf("%lld ",v);
        putchar('\n');
    }
    return 0;
}
```

### 欧拉路径

[【模板】欧拉路径](https://www.luogu.com.cn/problem/P7771)

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=1e5+5;
ll n,m,s,t;
ll out[N],in[N];
vector<ll> g[N];
stack<ll> ans;

void dfs(ll u){
    while (!g[u].empty()){
        ll v=g[u].back();
        g[u].pop_back();
        dfs(v);
    }
    ans.push(u);
}

int main(){
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=m;i++){
        ll u,v;
        scanf("%lld%lld",&u,&v);
        g[u].push_back(v);
        out[u]++,in[v]++;
    }
    for (ll u=1;u<=n;u++) sort(g[u].begin(),g[u].end(),greater<ll>() );
    for (int i=1;i<=n;i++){
        if (out[i]-in[i]==1) s=i;
        if (in[i]-out[i]==1) t=i;
    }
    for (int i=1;i<=n;i++){
        if (out[i]!=in[i]&&i!=t&&i!=s) {
            puts("No");
            return 0;
        }
    }
    if (s==0) dfs(1);
    else dfs(s);
    while (!ans.empty()){
        printf("%lld ",ans.top());
        ans.pop();
    }
    return 0;
}
```

### 二分图

#### 二分图判断

[[ABC327D] Good Tuple Problem](https://atcoder.jp/contests/abc327/tasks/abc327_d)

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=2e5+5;
ll n,m,a[N],notb,color[N],vis[N];
vector<ll> g[N];

void dfs(ll u){
    vis[u]=1;
    for (ll v:g[u]){
        if (vis[v]){
            if (color[v]==color[u]) notb=1;
        }
        else {
            color[v]=color[u]^1;
            dfs(v);
        }
    }
}

int main(){
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=m;i++) scanf("%lld",&a[i]);
    for (int i=1;i<=m;i++){
        ll v;
        scanf("%lld",&v);
        g[a[i]].push_back(v);
        g[v].push_back(a[i]);
    }
    for (int i=1;i<=n;i++){
        if (!vis[i]) dfs(i);
    }
    if (notb) puts("No");
    else puts("Yes");
    return 0;
}
```

#### 二分图最大匹配（匈牙利算法）

[【模板】二分图最大匹配](https://www.luogu.com.cn/problem/P3386)

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=5e2+5;
ll n,m,e,ans;
ll vis[N],match[N];
vector<ll> g[N];

ll find(ll u){
    for (ll v:g[u]){
        if (!vis[v]){
            vis[v]=1;
            if (!match[v]||find(match[v])){
                match[v]=u;
                return 1;
            }
        }
    }
    return 0;
}

int main(){
    scanf("%lld%lld%lld",&n,&m,&e);
    for (int i=1;i<=e;i++) {
        ll u,v;
        scanf("%lld%lld",&u,&v);
        g[u].push_back(v);
    }
    for (int i=1;i<=n;i++) {
        memset(vis,0,sizeof vis);
        ans+=find(i);
    }
    printf("%lld\n",ans);
    return 0;
}
```



### 网络流

[【模板】网络最大流](https://www.luogu.com.cn/problem/P3376)

#### 网络最大流（EK）

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=2e2+5;
const int M=5e3+5;
ll n,m,s,t,ans;
ll tot=1,h[N],dis[N],pre[N],vis[N];
struct node{
    ll v,w;
    ll nxt;
}e[M<<1];

void add(ll u,ll v,ll w){
    e[++tot]=(node){v,w,h[u]};
    h[u]=tot;
}

bool bfs(){
    memset(vis,0,sizeof vis);
    queue<ll> q;
    q.push(s);
    vis[s]=1;
    dis[s]=1e14;
    while (!q.empty()){
        ll u=q.front();
        q.pop();
        for (int i=h[u];i;i=e[i].nxt){
            ll v=e[i].v,w=e[i].w;
            if (vis[v]) continue;
            if (!w) continue;
            vis[v]=1;
            dis[v]=min(dis[u],w);
            pre[v]=i;
            q.push(v);
            if (v==t) return true;
        }
    }
    return false;
}

void update(){
    ll u=t;
    while (u!=s){
        ll v=pre[u];
        e[v].w-=dis[t];
        e[v^1].w+=dis[t];
        u=e[v^1].v;
    }
    ans+=dis[t];
}

int main(){
    scanf("%lld%lld%lld%lld",&n,&m,&s,&t);
    for (int i=1;i<=m;i++){
        ll u,v,w;
        scanf("%lld%lld%lld",&u,&v,&w);
        add(u,v,w);
        add(v,u,0);
    }
    while (bfs()) update();
    printf("%lld\n",ans);
    return 0;
}
```

#### 网络最大流（Dinic+当前弧优化）

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=2e2+5;
const int M=5e3+5;
const ll INF=1e14;
ll n,m,s,t,ans;
ll tot=1,h[N],dis[N],cur[N];
struct node{
    ll v,w;
    ll nxt;
}e[M<<1];

void add(ll u,ll v,ll w){
    e[++tot]=(node){v,w,h[u]};
    h[u]=tot;
}

bool bfs(){
    for (int i=1;i<=n;i++) dis[i]=INF,cur[i]=h[i];
    queue<ll> q;
    q.push(s);
    dis[s]=0;
    while (!q.empty()){
        ll u=q.front();
        q.pop();
        for (int i=h[u];i;i=e[i].nxt){
            ll v=e[i].v,w=e[i].w;
            if (w&&dis[v]==INF){
                q.push(v);
                dis[v]=dis[u]+1;
            }
        }
    }
    return dis[t]!=INF;
}

ll dfs(ll u,ll sum){
    if (u==t) return sum;
    ll res=0;
    for (ll &i=cur[u];i&&sum;i=e[i].nxt){
        ll v=e[i].v,w=e[i].w;
        if (w&&dis[v]==dis[u]+1){
            ll k=dfs(v,min(sum,w));
            if (!k) dis[v]=INF;
            e[i].w-=k;
            e[i^1].w+=k;
            res+=k;
            sum-=k;
        }
    }
    return res;
}

int main(){
    scanf("%lld%lld%lld%lld",&n,&m,&s,&t);
    for (int i=1;i<=m;i++){
        ll u,v,w;
        scanf("%lld%lld%lld",&u,&v,&w);
        add(u,v,w);
        add(v,u,0);
    }
    while (bfs()) ans+=dfs(s,INF);
    printf("%lld\n",ans);
    return 0;
}
```

### LCA

[【模板】最近公共祖先（LCA）](https://www.luogu.com.cn/problem/P3379)

#### 倍增求 LCA

```cpp {class="code-closed"}
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;

const int N=5e5+5;
const int K=20;
ll n,m,s,fa[N][K],dep[N];
vector<ll> g[N];

void dfs(ll u,ll f){
    dep[u]=dep[f]+1;
    fa[u][0]=f;
    for (ll v:g[u]){
        if (v==f) continue;
        dfs(v,u);
    }
}

void init(){
    for (int i=1;i<K;i++){
        for (int u=1;u<=n;u++){
            fa[u][i]=fa[fa[u][i-1]][i-1];
        }
    }
}

ll lca(ll u,ll v){
    if (dep[u]<dep[v]) swap(u,v);
    for (int i=K-1;i>=0;i--){
        if (dep[fa[u][i]]>=dep[v]) u=fa[u][i];
    }
    if (u==v) return u;
    for (int i=K-1;i>=0;i--){
        if (fa[u][i]!=fa[v][i]) u=fa[u][i],v=fa[v][i];
    }
    return fa[u][0];
}

int main(){
    scanf("%lld%lld%lld",&n,&m,&s);
    for (int i=1;i<n;i++){
        ll u,v;
        scanf("%lld%lld",&u,&v);
        g[u].push_back(v);
        g[v].push_back(u);
    }
    dfs(s,0);
    init();
    while (m--){
        ll u,v;
        scanf("%lld%lld",&u,&v);
        printf("%lld\n",lca(u,v));
    }
    return 0;
}

```

#### 树链剖分求 LCA

```cpp {class="code-closed"}
#include<cstdio>
#include<vector>
using namespace std;

typedef long long ll;
const int N=5e5+5;
ll n,q,s;
ll dep[N],anc[N][20],fa[N],dfn[N],son[N],top[N],siz[N],cnt;
vector<ll> g[N];

void dfs1(ll u,ll p){
    siz[u]=1;
    fa[u]=p;
    dep[u]=dep[p]+1;
    for (ll v:g[u]){
        if (v==p) continue;
        dfs1(v,u);
        siz[u]+=siz[v];
        if (siz[v]>siz[son[u]]) son[u]=v;
    }
}

void dfs2(ll u,ll t){
    dfn[u]=++cnt;
    top[u]=t;
    if (son[u]) {
        dfs2(son[u],t);
        for (ll v:g[u]){
            if (v==fa[u]||v==son[u]) continue;
            dfs2(v,v);
        }
    }
}

ll LCA(ll u,ll v){
    while (top[u]!=top[v]){
        if (dep[top[u]]<dep[top[v]]) swap(u,v);
        u=fa[top[u]];
    }
    if (dfn[u]>=dfn[v]) return v;
    else return u;
}

int main(){
    scanf("%lld%lld%lld",&n,&q,&s);
    for (int i=1;i<n;i++) {
        ll u,v;
        scanf("%lld%lld",&u,&v);
        g[u].push_back(v);
        g[v].push_back(u);
    }
    dfs1(s,0);
    dfs2(s,s);
    while (q--){
        ll u,v;
        scanf("%lld%lld",&u,&v);
        printf("%lld\n",LCA(u,v));
    }
    return 0;
}

```

### 拓扑排序

[最长路](https://www.luogu.com.cn/problem/P1807)

```cpp {class="code-closed"}
#include <bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=1505;
ll n,m;
ll in[N],dp[N];
struct node{
    ll v,w;
};
vector<node> g[N];
queue<ll> q;
vector<ll> l;

int main(){
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=m;i++){
        ll u,v,w;
        scanf("%lld%lld%lld",&u,&v,&w);
        g[u].push_back((node){v,w});
        in[v]++;
    }
    for (int i=1;i<=n;i++){
        if (!in[i]) q.push(i);
    }
    while (!q.empty()){
        ll u=q.front();
        q.pop();
        l.push_back(u);
        for (node ed:g[u]){
            ll v=ed.v;
            if (!(--in[v])) q.push(v);
        }
    }
    for (int i=1;i<=n;i++) dp[i]=-1e14;
    dp[1]=0;
    for (ll u:l){
        if (dp[u]==-1e14) continue;
        for (node ed:g[u]){
            ll v=ed.v,w=ed.w;
            if (dp[v]<dp[u]+w) dp[v]=dp[u]+w;
        }
    }
    if (dp[n]==-1e14) puts("-1");
    else printf("%lld\n",dp[n]);
    return 0;
}
```

## 数据结构

### 单调队列

[【模板】单调队列 / 滑动窗口](https://www.luogu.com.cn/problem/P1886)

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;
#define u first
#define v second

typedef long long ll;
typedef pair<ll,ll> PLL;
const int N=1e6+5;

ll n,k;
ll res1[N],res2[N];
deque<PLL> m1,m2;

int main(){
    scanf("%lld%lld",&n,&k);
    for (int i=1;i<=n;i++){
        ll x;
        scanf("%lld",&x);
        PLL t;
        t.u=i,t.v=x;
        while ((!m1.empty())&&m1.back().v>=x) m1.pop_back();
        while ((!m2.empty())&&m2.back().v<=x) m2.pop_back();
        m1.push_back(t);
        m2.push_back(t);
        while ((!m1.empty())&&m1.front().u<i-k+1) m1.pop_front();
        while ((!m2.empty())&&m2.front().u<i-k+1) m2.pop_front();
        if (i-k>=0) {
            res1[i-k+1]=m1.front().v;
            res2[i-k+1]=m2.front().v;
        }
    }
    for (int i=1;i<=n-k+1;i++) printf("%lld ",res1[i]);
    putchar('\n');
    for (int i=1;i<=n-k+1;i++) printf("%lld ",res2[i]);
}
```

### 单调栈

[【模板】单调栈](https://www.luogu.com.cn/problem/P5788)

```cpp {class="code-closed"}
#include<cstdio>
#include<stack>
using namespace std;

typedef long long ll;
const int N=3e6+5;
ll n,a[N],f[N];
struct node{
    ll n,i;
};
stack<node> s;

int main(){
    scanf("%lld",&n);
    for (int i=1;i<=n;i++) scanf("%lld",&a[i]);
    for (int i=n;i>=1;i--){
        while (!s.empty()&&s.top().n<=a[i]) s.pop();
        if (s.empty()) f[i]=0;
        else f[i]=s.top().i;
        s.push((node){a[i],i});
    }
    for (int i=1;i<=n;i++) printf("%lld ",f[i]);
    return 0;
}
```

### 线段树

[P3373 【模板】线段树 2](https://www.luogu.com.cn/problem/P3373)

```cpp {class="code-closed"}
#include<cstdio>
using namespace std;

typedef long long ll;
const ll N=100005;
ll n,q,M,a[N],tr[4*N];
ll tag[4*N],mul[4*N];

void pd(ll id,ll s,ll t){
    ll l=id<<1,r=id<<1|1;
    ll mid=s+t>>1;
    if (mul[id]!=1){
        mul[l]=(mul[l]*mul[id])%M;
        mul[r]=(mul[r]*mul[id])%M;
        tag[l]=(tag[l]*mul[id])%M;
        tag[r]=(tag[r]*mul[id])%M;
        tr[l]=(tr[l]*mul[id])%M;
        tr[r]=(tr[r]*mul[id])%M;
        mul[id]=1;
    }
    if (tag[id]){
        tag[l]=(tag[l]+tag[id])%M;
        tag[r]=(tag[r]+tag[id])%M;
        tr[l]=(tr[l]+(mid-s+1)*tag[id])%M;
        tr[r]=(tr[r]+(t-mid)*tag[id])%M;
        tag[id]=0;
    }
    return ;
}

void build(ll id,ll s,ll t){
    mul[id]=1;
    if (s==t){
        tr[id]=a[s];
        return ;
    }
    ll mid=s+t>>1;
    build(id<<1,s,mid);
    build(id<<1|1,mid+1,t);
    tr[id]=(tr[id<<1]+tr[id<<1|1])%M;
    return ;
}

void add(ll id,ll l,ll r,ll s,ll t,ll c){
    if (l<=s&&t<=r){
        tr[id]=(tr[id]+(t-s+1)*c)%M;
        tag[id]=(tag[id]+c)%M;
        return ;
    }
    pd(id,s,t);
    ll mid=s+t>>1;
    if (l<=mid) add(id<<1,l,r,s,mid,c);
    if (r>mid) add(id<<1|1,l,r,mid+1,t,c);
    tr[id]=(tr[id<<1]+tr[id<<1|1])%M;
    return ;
}

void times(ll id,ll l,ll r,ll s,ll t,ll c){
    if (l<=s&&t<=r){
        mul[id]=(mul[id]*c)%M;
        tag[id]=(tag[id]*c)%M;
        tr[id]=(tr[id]*c)%M;
        return ;
    }
    pd(id,s,t);
    ll mid=s+t>>1;
    if (l<=mid) times(id<<1,l,r,s,mid,c);
    if (r>mid) times(id<<1|1,l,r,mid+1,t,c);;
    tr[id]=(tr[id<<1]+tr[id<<1|1])%M;
}

ll getsum(ll id,ll l,ll r,ll s,ll t){
    if (l<=s&&t<=r){
        return tr[id];
    }
    pd(id,s,t);
    ll mid=s+t>>1;
    ll sum=0;
    if (l<=mid) sum+=getsum(id<<1,l,r,s,mid);
    if (r>mid) sum+=getsum(id<<1|1,l,r,mid+1,t);
    tr[id]=(tr[id<<1]+tr[id<<1|1])%M;
    return sum%M;
}

int main(){
    scanf("%lld%lld%lld",&n,&q,&M);
    for (int i=1;i<=n;i++) scanf("%lld",&a[i]);
    build(1,1,n);
    while (q--){
        ll t,x,y,k;
        scanf("%lld%lld%lld",&t,&x,&y);
        if (t==1){
            scanf("%lld",&k);
            times(1,x,y,1,n,k);
        }
        else if (t==2){
            scanf("%lld",&k);
            add(1,x,y,1,n,k);
        }
        else {
            printf("%lld\n",getsum(1,x,y,1,n));
        }
    }
    return 0;
}

```


### 扫描线

[【模板】扫描线 & 矩形面积并](https://www.luogu.com.cn/problem/P5490)

```cpp {class="code-closed"}
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;

const int N=1e5+5;
ll n,cnt,len,ans,xn[N<<1];
struct line{
    ll h,l,r;
    ll jud;
    bool operator<(const line &b) const{
        return h<b.h;
    }
}li[N<<1];
struct node{
    ll cnt,len,sum;
}tr[N<<3];
map<ll,ll> ind;

void build(ll id,ll s,ll t){
    if (s==t){
        tr[id].len=xn[s+1]-xn[s];
        return ;
    }
    ll mid=s+t>>1;
    build(id<<1,s,mid);
    build(id<<1|1,mid+1,t);
    tr[id].len=tr[id<<1].len+tr[id<<1|1].len;
}

void pushup(ll id,ll s,ll t){
    if (tr[id].cnt>0) tr[id].sum=tr[id].len;
    else if (s==t) tr[id].sum=0;
    else tr[id].sum=tr[id<<1].sum+tr[id<<1|1].sum;
}

void update(ll id,ll s,ll t,ll l,ll r,ll c){
    if (l<=s&&t<=r){
        tr[id].cnt+=c;
        pushup(id,s,t);
        return ;
    }
    ll mid=s+t>>1;
    if (l<=mid) update(id<<1,s,mid,l,r,c);
    if (r>mid) update(id<<1|1,mid+1,t,l,r,c);
    pushup(id,s,t);
}

int main(){
    scanf("%lld",&n);
    for (int i=1;i<=n;i++){
        ll x1,x2,y1,y2;
        scanf("%lld%lld%lld%lld",&x1,&y1,&x2,&y2);
        ++cnt,li[cnt].l=x1,li[cnt].r=x2,li[cnt].h=y1,li[cnt].jud=1,xn[cnt]=x1;
        ++cnt,li[cnt].l=x1,li[cnt].r=x2,li[cnt].h=y2,li[cnt].jud=-1,xn[cnt]=x2;
    }
    sort(xn+1,xn+1+cnt);
    sort(li+1,li+1+cnt);
    len=unique(xn+1,xn+1+cnt)-xn-1;
    for (int i=1;i<=len;i++) ind[xn[i]]=i;
    for (int i=1;i<=cnt;i++) li[i].l=ind[li[i].l],li[i].r=ind[li[i].r];
    len--;
    build(1,1,len);
    for (int i=1;i<cnt;i++){
        update(1,1,len,li[i].l,li[i].r-1,li[i].jud);
        ans+=tr[1].sum*(li[i+1].h-li[i].h);
    }
    printf("%lld\n",ans);
    return 0;
}
```

### 线段树二分

[CF91B Queue](https://codeforces.com/problemset/problem/91/B)

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=1e5+5;
ll n,a[N];
ll tr[N<<2];

void build(ll id,ll s,ll t){
    if (s==t){
        tr[id]=a[s];
        return ;
    }
    ll mid=s+t>>1;
    build(id<<1,s,mid);
    build(id<<1|1,mid+1,t);
    tr[id]=min(tr[id<<1],tr[id<<1|1]);
}

ll query(ll id,ll l,ll r,ll s,ll t,ll c){
    if (l>r) return 0;
    if (s==t) return s-l+1;
    ll mid=s+t>>1;
    if (tr[id<<1|1]<c&&r>mid) return query(id<<1|1,l,r,mid+1,t,c);
    else if(tr[id<<1]<c&&l<=mid) return query(id<<1,l,r,s,mid,c);
    else return 0;
}

int main(){
    scanf("%lld",&n);
    for (int i=1;i<=n;i++){
        scanf("%lld",&a[i]);
    }
    memset(tr,0x3f,sizeof tr);
    build(1,1,n);
    for (int i=1;i<=n;i++){
        printf("%lld ",query(1,i+1,n,1,n,a[i])-1);
    }
    return 0;
}
```

### 可持久化线段树

[【模板】可持久化线段树 1（可持久化数组）](https://www.luogu.com.cn/problem/P3919)

```cpp {class="code-closed"}
#include<cstdio>
using namespace std;

typedef long long ll;
const int N=1e6+5;
ll n,m;
ll tot;
ll a[N],rt[N],ls[N<<5],rs[N<<5];

ll build(ll s,ll t){
    ll id=++tot;
    if (s==t){
        ls[id]=a[s];
        rs[id]=a[s];
        return id;
    }
    ll mid=s+t>>1;
    ls[id]=build(s,mid);
    rs[id]=build(mid+1,t);
    return id;
}

ll update(ll pre,ll s,ll t,ll p,ll c){
    if (!p) return pre;
    ll id=++tot;
    ls[id]=ls[pre],rs[id]=rs[pre];
    if (s==t){
        ls[id]=c;
        rs[id]=c;
        return id;
    }
    ll mid=s+t>>1;
    if (p<=mid) ls[id]=update(ls[pre],s,mid,p,c);
    else rs[id]=update(rs[pre],mid+1,t,p,c);
    return id;
}

ll query(ll pre,ll s,ll t,ll p){
    if (s==t) return ls[pre];
    ll mid=s+t>>1;
    if (p<=mid) return query(ls[pre],s,mid,p);
    else return query(rs[pre],mid+1,t,p);
}

int main(){
    scanf("%lld%lld",&n,&m);
    for (int i=1;i<=n;i++) scanf("%lld",&a[i]);
    rt[0]=build(1,n);
    for (int i=1;i<=m;i++){
        ll v,opt,p,c;
        scanf("%lld%lld%lld",&v,&opt,&p);
        if (opt==1){
            scanf("%lld",&c);
            rt[i]=update(rt[v],1,n,p,c);
        }
        else {
            rt[i]=update(rt[v],1,n,0,0);
            ll res=query(rt[v],1,n,p);
            printf("%lld\n",res);
        }
    }
}
```

### 树链剖分

[P3384 【模板】重链剖分 / 树链剖分](https://www.luogu.com.cn/problem/P3384)

```cpp {class="code-closed"}
#include<cstdio>
#include<vector>
#include<algorithm>
using namespace std;

typedef long long ll;
const int N=1e5+5;
ll n,q,r,P;
ll a[N];
vector<ll> g[N];
ll dfn[N],dep[N],siz[N],son[N],fa[N],top[N],rnk[N],viscnt;
ll tr[N<<2],tag[N<<2];

void dfs1(ll u,ll f){
    siz[u]=1;
    fa[u]=f;
    dep[u]=dep[f]+1;
    for (ll v:g[u]){
        if (v==f) continue;
        dfs1(v,u);
        siz[u]+=siz[v];
        if (siz[v]>siz[son[u]]) son[u]=v;
    }
}

void dfs2(ll u,ll t){
    top[u]=t;
    dfn[u]=++viscnt;
    rnk[viscnt]=u;
    if (son[u]) {
        dfs2(son[u],t);
        for (ll v:g[u]){
            if (v==fa[u]||v==son[u]) continue;
            dfs2(v,v);
        }
    }
}

void build(ll id,ll s,ll t){
    if (s==t) {
        tr[id]=a[rnk[s]];
        return ;
    }
    ll mid=s+t>>1;
    build(id<<1,s,mid);
    build(id<<1|1,mid+1,t);
    tr[id]=(tr[id<<1]+tr[id<<1|1])%P;
}

void pd(ll id,ll s,ll t){
    ll mid=s+t>>1;
    ll l=id<<1,r=id<<1|1,c=tag[id];
    tr[l]=(tr[l]+c*(mid-s+1))%P;
    tr[r]=(tr[r]+c*(t-mid))%P;
    tag[l]=(tag[l]+c)%P;
    tag[r]=(tag[r]+c)%P;
    tag[id]=0;
}

void update(ll id,ll s,ll t,ll l,ll r,ll c){
    if (l<=s&&t<=r){
        tr[id]=(tr[id]+c*(t-s+1))%P;
        tag[id]=(tag[id]+c)%P;
        return ;
    }
    pd(id,s,t);
    ll mid=s+t>>1;
    if (l<=mid) update(id<<1,s,mid,l,r,c);
    if (r>mid) update(id<<1|1,mid+1,t,l,r,c);
    tr[id]=(tr[id<<1]+tr[id<<1|1])%P;
}

ll query(ll id,ll s,ll t,ll l,ll r){
    if (l<=s&&t<=r) return tr[id]%P;
    pd(id,s,t);
    ll mid=s+t>>1,res=0;
    if (l<=mid) res=(res+query(id<<1,s,mid,l,r))%P;
    if (r>mid) res=(res+query(id<<1|1,mid+1,t,l,r))%P;
    return res%P;
}

void pre_update(ll x,ll y,ll z){
    while (top[x]!=top[y]){
        if (dep[top[x]]<dep[top[y]]) swap(x,y);
        update(1,1,n,dfn[top[x]],dfn[x],z);
        x=fa[top[x]];
    }
    update(1,1,n,min(dfn[x],dfn[y]),max(dfn[x],dfn[y]),z);
}

ll pre_query(ll x,ll y){
    ll res=0;
    while (top[x]!=top[y]){
        if (dep[top[x]]<dep[top[y]]) swap(x,y);
        res=(res+query(1,1,n,dfn[top[x]],dfn[x]))%P;
        x=fa[top[x]];
    }
    res=(res+query(1,1,n,min(dfn[x],dfn[y]),max(dfn[x],dfn[y])))%P;
    return res;
}

int main(){
    scanf("%lld%lld%lld%lld",&n,&q,&r,&P);
    for (int i=1;i<=n;i++) scanf("%lld",&a[i]);
    for (int i=1;i<n;i++) {
        ll u,v;
        scanf("%lld%lld",&u,&v);
        g[u].push_back(v);
        g[v].push_back(u);
    }
    dfs1(r,0);
    dfs2(r,r);
    build(1,1,n);
    while (q--){
        ll opt;
        scanf("%lld",&opt);
        if (opt==1){
            ll x,y,z;
            scanf("%lld%lld%lld",&x,&y,&z);
            pre_update(x,y,z);
        }
        else if(opt==2){
            ll x,y;
            scanf("%lld%lld",&x,&y);
            printf("%lld\n",pre_query(x,y)%P);
        }
        else if (opt==3){
            ll x,z;
            scanf("%lld%lld",&x,&z);
            update(1,1,n,dfn[x],dfn[x]+siz[x]-1,z);
        }
        else{
            ll x;
            scanf("%lld",&x);
            printf("%lld\n",query(1,1,n,dfn[x],dfn[x]+siz[x]-1)%P);
        }
    }
    return 0;
}
```

### 笛卡尔树

[【模板】笛卡尔树](https://www.luogu.com.cn/problem/P5854)

```cpp {class="code-closed"}
#include <bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=1e7+5;
ll n,a[N],l[N],r[N],ans1,ans2;
stack<ll> s;

int main(){
    scanf("%lld",&n);
    for (int i=1;i<=n;i++) {
        scanf("%lld",&a[i]);
        ll k=0;
        while (!s.empty()&&a[s.top()]>a[i]){
            k=s.top();
            s.pop();
        }
        l[i]=k;
        if (!s.empty()) r[s.top()]=i;
        s.push(i);
    }
    for (int i=1;i<=n;i++) ans1^=i*(l[i]+1),ans2^=i*(r[i]+1);
    printf("%lld %lld\n",ans1,ans2);
    return 0;
}
```

## 数学

### 快速幂

```cpp {class="code-closed"}
ll binpow(ll a,ll b,ll P){
    ll res=1;
    while (b){
        if (b&1) res=res*a%P;
        b>>=1;
        a=a*a%P;
    }
    return res;
}
```

### GCD

```cpp {class="code-closed"}
ll gcd(ll a,ll b){
    while (b){
        ll t=a;
        a=b;
        b=t%b;
    }
    return a;
}
```

### 线性筛

[【模板】线性筛素数](https://www.luogu.com.cn/problem/P3383)

```cpp {class="code-closed"}
#include<bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N=1e8+5;
const int M=1e7+10;
int n,q;
int prime[M],notprime[N],cnt;

int main(){
    scanf("%d%d",&n,&q);
    for (int i=2;i<=n;i++){
        if (!notprime[i]) prime[++cnt]=i;
        for (int j=1;j<=cnt&&prime[j]*i<=N-5;j++){
            notprime[prime[j]*i]=1;
            if (i%prime[j]==0) break;
        }
    }
    while (q--){
        int k;
        scanf("%d",&k);
        printf("%d\n",prime[k]);
    }
    return 0;
}
```

### 扩展欧几里得

```cpp {class="code-closed"}

```

## 字符串

### KMP

[【模板】KMP](https://www.luogu.com.cn/problem/P3375)

```cpp {class="code-closed"}
#include<cstdio>
using namespace std;

const int N=1e6+5;
char s[N],t[N];
int pi[N];

int main(){
    scanf("%s",s+1);
    scanf("%s",t+1);
    for (int i=2,j=0;t[i];i++){
        while (j&&t[j+1]!=t[i]) j=pi[j];
        if (t[j+1]==t[i]) pi[i]=++j;
    }
    for (int i=1,j=0;s[i];i++){
        while (j&&t[j+1]!=s[i]) j=pi[j];
        if (t[j+1]==s[i]) j++;
        if (t[j+1]=='\0'){
            printf("%d\n",i-j+1);
            j=pi[j];
        }
    }
    for (int i=1;t[i];i++) printf("%d ",pi[i]);
}
```

### 扩展 KMP（Z 函数）

[【模板】扩展 KMP / exKMP（Z 函数）](https://www.luogu.com.cn/problem/P5410)

```cpp {class="code-closed"}
#include<cstdio>
#include<algorithm>
#include<cstring>
using namespace std;

typedef long long ll;
const int N=2e7+5;
char a[N],b[N];
ll n,m,z[N],p[N];
ll ans1,ans2;

int main(){
    scanf("%s",a+1);
    scanf("%s",b+1);
    n=strlen(a+1);
    m=strlen(b+1);
    z[1]=m;
    for (int i=2,l=1,r=1;i<=m;i++){
        if (i<=r) z[i]=min((ll)r-i+1,z[i-l+1]);
        while (i+z[i]<=m&&b[z[i]+1]==b[i+z[i]]) ++z[i];
        if (i+z[i]-1>r) l=i,r=i+z[i]-1;
    }
    for (int i=1,l=0,r=0;i<=n;i++){
        if (i<=r) p[i]=min((ll)r-i+1,z[i-l+1]);
        while (i+p[i]<=n&&b[p[i]+1]==a[i+p[i]]) ++p[i];
        if (i+p[i]-1>r) l=i,r=i+p[i]-1;
    }
    ans1=z[1]+1,ans2=p[1]+1;
    for (int i=2;i<=m;i++) ans1^=i*(z[i]+1);
    for (int i=2;i<=n;i++) ans2^=i*(p[i]+1);
    printf("%lld\n%lld",ans1,ans2);
}
```

### Manacher

[【模板】Manacher](https://www.luogu.com.cn/problem/P3805)

```cpp {class="code-closed"}
#include<cstdio>
#include<algorithm>
using namespace std;

typedef long long ll;
const int N=1.1e7+5;
char s[N<<1];
ll n,d[N<<1],cnt,ans;

int main(){
    s[0]='#';
    char c=getchar();
    while (c>='a'&&c<='z'){
        s[++cnt]=c;
        s[++cnt]='#';
        c=getchar();
    }
    for (int i=0,l=0,r=-1;s[i];i++){
        ll k;
        if (i>r) k=1;
        else k=min(d[l+r-i],(ll)r-i+1);
        while (i>=k&&i+k<=cnt&&s[i-k]==s[i+k]) k++;
        d[i]=k--;
        if (i+k>r) l=i-k,r=i+k;
    }
    for (int i=0;i<=cnt;i++){
        if (i&1) d[i]>>=1,ans=max(ans,d[i]*2-1);
        else  d[i]>>=1,ans=max(ans,d[i]*2);
    }
    printf("%lld\n",ans);
    return 0;
}
```

### AC 自动机

[【模板】AC 自动机](https://www.luogu.com.cn/problem/P5357)

```cpp {class="code-closed"}
#include<cstdio>
#include<cstring>
#include<queue>
using namespace std;

typedef long long ll;
const int T=2e5+5;
const int N=2e6+5;
ll n,ans,cnt=1;
char s[N];
ll tr[N][30],tag[N],ind[N],fail[N];
ll in[N],res[N],vis[N];

void insert(char t[],ll id){
    ll u=1;
    for (int i=1;t[i];i++){
        ll c=t[i]-'a';
        if (!tr[u][c]) tr[u][c]=++cnt;
        u=tr[u][c];
    }
    if (!tag[u]) tag[u]=id;
    ind[id]=tag[u];
}

void build_fail(){
    for (int i=0;i<26;i++) tr[0][i]=1;
    queue<ll> q;
    q.push(1);
    while (!q.empty()){
        ll u=q.front();
        q.pop();
        ll fafail=fail[u];
        for (int i=0;i<26;i++){
            ll c=tr[u][i];
            if (!c){
                tr[u][i]=tr[fafail][i];
                continue;
            }
            fail[c]=tr[fafail][i];
            in[fail[c]]++;
            q.push(c);
        }
    }
}

void query(){
    ll u=1;
    for (int i=1;s[i];i++){
        ll c=s[i]-'a';
        u=tr[u][c];
        res[u]++;
    }
}

void topo_sort(){
    queue<ll> q;
    for (int i=1;i<=cnt;i++){
        if (!in[i]) q.push(i);
    }
    while (!q.empty()){
        ll u=q.front();
        q.pop();
        vis[tag[u]]=res[u];
        ll v=fail[u];
        if (!(--in[v])) q.push(v);
        res[v]+=res[u];
    }
}

int main(){
    scanf("%lld",&n);
    for (int i=1;i<=n;i++){
        char t[T];
        scanf("%s",t+1);
        insert(t,i);
    }
    scanf("%s",s+1);
    build_fail();
    query();
    topo_sort();
    for (int i=1;i<=n;i++) printf("%lld\n",vis[ind[i]]);
}
```

### 双模哈希

[兔子与兔子](https://www.luogu.com.cn/problem/P10468)

```cpp {class="code-closed"}
#include <bits/stdc++.h>
using namespace std;

typedef long long ll;
typedef pair<ll,ll> PLL;
const int N=1e6+5;
const ll P1=(1ll<<31)-1,P2=(1ll<<31)-19;
mt19937 rnd(time(0));
ll n,m,b1,b2,h1[N],h2[N],pw1[N],pw2[N];
char s[N];

PLL get(ll l,ll r){
    ll len=r-l+1;
    ll x=h1[r]-h1[l-1]*pw1[len]%P1;
    ll y=h2[r]-h2[l-1]*pw2[len]%P2;
    if (x<0) x+=P1;
    if (y<0) y+=P2;
    return {x,y};
}

bool jud(ll l1,ll r1,ll l2,ll r2){
    return r1-l1==r2-l2&&get(l1,r1)==get(l2,r2);
}

int main(){
    scanf("%s",s+1);
    n=strlen(s+1);
    b1=rnd()%(P1-257)+256,b2=rnd()%(P2-257)+256;
    pw1[0]=pw2[0]=1;
    for (int i=1;i<=n;i++){
        h1[i]=(h1[i-1]*b1+s[i])%P1;
        h2[i]=(h2[i-1]*b2+s[i])%P2;
        pw1[i]=pw1[i-1]*b1%P1;
        pw2[i]=pw2[i-1]*b2%P2;
    }
    scanf("%lld",&m);
    while (m--){
        ll l1,r1,l2,r2;
        scanf("%lld%lld%lld%lld",&l1,&r1,&l2,&r2);
        if (jud(l1,r1,l2,r2)) puts("Yes");
        else puts("No");
    }
    return 0;
}
```

## 其他

### 二分答案

#### 模板一（找到第一个满足条件的）

```cpp {class="code-closed"}
while (l<r){
    ll mid=l+r>>1;
    if (check(mid)) r=mid
    else l=mid+1;
}
```

#### 模板二（找到最后一个满足条件的）

```cpp {class="code-closed"}
while (l<r){
    ll mid=l+r+1>>1;
    if (check(mid)) l=mid
    else r=mid-1;
}
```

### 高维前缀和

```cpp {class="code-closed"}
ll tot=1<<n;
for (ll i=0;i<n;i++) {
    for (ll mask=0;mask<tot;mask++) {
        if (mask&(1<<i)) f[mask]+=f[mask^(1<<i)];
    }
}
```

### 压位高精度

[A+B A-B A*B A/B A%B Problem](https://www.luogu.com.cn/problem/P1932)

```cpp {class="code-closed"}
#include<cstdio>
#include<cstring>
#include<algorithm>
using namespace std;

typedef long long ll;
static const int N=1e4+5;

struct BN{
    static const int BIT=9;
    static const int P=1e9;
    ll a[N],sgn;    // a[0] is the length of a, sgn is the sign of the number

    //init
    BN(){
        memset(a,0,sizeof(a));
        a[0]=sgn=1;
    }
    void init(){
        memset(a,0,sizeof(a));
        a[0]=sgn=1;
    }

    //IO
    void read(){
        char s[N];
        scanf("%s",s);
        if (s[0]=='-'){
            sgn=-1;
            for (int i=0;s[i];i++) s[i]=s[i+1];
        }
        *this=s;
    }
    void write(){
        if(sgn==-1) putchar('-');
        printf("%lld",a[a[0]]);
        for(int i=a[0]-1;i>=1;i--) printf("%09lld",a[i]);
    }

    //assign
    BN operator=(const char *num){
        ll l=strlen(num);
        a[0]=0;
        for (int i=l-1;i>=0;i-=BIT){
            a[0]++;
            ll w=1;
            for (int j=i;j>=i-BIT+1&&j>=0;j--){
                a[a[0]]+=w*(num[j]-'0');
                w=(w<<3)+(w<<1);
            }
        }
        return *this;
    }
    BN operator=(const ll num){
        char a[N];
        sprintf(a,"%lld",num);
        *this=a;
        return *this;
    }
    BN (ll num) {*this=num;}
    BN (const char *num) {*this=num;}

    //abs
    BN abs() const{
        BN c=*this;
        c.sgn=1;
        return c;
    }

    //compare
    bool operator==(const BN &b) {
        if (sgn!=b.sgn) return false;
        if (a[0]!=b.a[0]) return false;
        for(int i=1;i<=a[0];i++) if(a[i]!=b.a[i]) return false;
        return true;
    }
    bool operator!=(const BN &b) {return !(*this==b);}
    bool operator<(const BN &b) {
        if (sgn!=b.sgn) return sgn<b.sgn;
        if (a[0]!=b.a[0]) return a[0]<b.a[0];
        for(int i=a[0];i>=1;i--){
            if(a[i]!=b.a[i]) return a[i]<b.a[i];
        }
        return false;
    }
    bool operator>(const BN &b) {
        if (sgn!=b.sgn) return sgn>b.sgn;
        if (a[0]!=b.a[0]) return a[0]>b.a[0];
        for(int i=a[0];i>=1;i--){
            if(a[i]!=b.a[i]) return a[i]>b.a[i];
        }
        return false;
    }
    bool operator<=(const BN &b) {return *this<b||*this==b;}
    bool operator>=(const BN &b) {return *this>b||*this==b;}

    //clac
    BN operator+(const BN &b) const{
        if (sgn!=b.sgn) return *this-(-b);
        BN c;
        c.a[0]=max(a[0],b.a[0])+1;
        c.sgn=sgn;
        for (int i=1;i<=c.a[0];i++){
            c.a[i]+=a[i]+b.a[i];
            if (c.a[i]>=P){
                c.a[i+1]+=c.a[i]/P;
                c.a[i]%=P;
            }
        }
        while (c.a[c.a[0]]==0&&c.a[0]>1) c.a[0]--;
        if (c.a[0]==1&&c.a[1]==0) c.sgn=1;
        return c;
    }
    BN operator+=(const BN &b) {
        *this=*this + b;
        return *this;
    }
    BN operator-() const{
        BN c=*this;
        c.sgn*=-1;
        return c;
    }
    BN operator-(const BN &b) const{
        if (sgn!=b.sgn) return *this+(-b);
        if (abs()<b.abs()) return -(b-(*this));
        BN c;
        c.a[0]=max(a[0],b.a[0]);
        c.sgn=sgn;
        for (int i=1;i<=c.a[0];i++){
            c.a[i]+=a[i]-b.a[i];
            if (c.a[i]<0){
                c.a[i]+=P;
                c.a[i+1]--;
            }
        }
        while (c.a[c.a[0]]==0&&c.a[0]>1) c.a[0]--;
        if (c.a[0]==1&&c.a[1]==0) c.sgn=1;
        return c;
    }
    BN operator-=(const BN &b) {
        *this=*this - b;
        return *this;
    }
    BN operator*(const BN &b){
        BN c;
        c.a[0]=a[0]+b.a[0];
        c.sgn=sgn*b.sgn;
        for (int i=1;i<=a[0];i++){
            for (int j=1;j<=b.a[0];j++){
                c.a[i+j-1]+=a[i]*b.a[j];
                if (c.a[i+j-1]>=P){
                    c.a[i+j]+=c.a[i+j-1]/P;
                    c.a[i+j-1]%=P;
                }
            }
        }
        while (c.a[c.a[0]]==0&&c.a[0]>1) c.a[0]--;
        if (c.a[0]==1&&c.a[1]==0) c.sgn=1;
        return c;
    }
    BN operator*=(const BN &b) {
        *this=*this * b;
        return *this;
    }
    BN operator<<(const int &b) {
        a[0]++;
        for (int i=1;i<=a[0];i++){
            a[i]<<=b;
            if (a[i-1]>=P) {
                a[i-1]-=P;
                a[i]++;
            }
        }
        while (a[a[0]]==0&&a[0]>1) a[0]--;
        return *this;
    }
    BN operator<<=(const int &b) {
        *this=*this<<b;
        return *this;
    }
    BN operator>>(const int &b){
        for (int i=a[0];i>=1;i--){
            if ((a[i]&1)&&(i>1)) a[i-1]+=P;
            a[i]>>=b;
        }
        while (a[a[0]]==0&&a[0]>1) a[0]--;
        if (a[0]==1&&a[1]==0) sgn=1;
        return *this;
    }
    BN operator>>=(const int &b) {
        *this=*this>>b;
        return *this;
    }
    BN operator/(const BN &b) const{
        BN c=abs(),k=b.abs();
        BN t,lt;
        t.a[1]=1;
        while (c>=k) k<<=1,t<<=1;
        while (t.a[0]>1||t.a[1]){
            if (c>=k) c-=k,lt+=t;
            k>>=1,t>>=1;
        }
        c=lt;
        c.sgn=sgn*b.sgn;
        while (c.a[c.a[0]]==0&&c.a[0]>1) c.a[0]--;
        if (c.a[0]==1&&c.a[1]==0) c.sgn=1;
        return c;
    }
    BN operator/=(const BN &b) {
        *this=*this/b;
        return *this;
    }
    BN operator%(const BN &b) const{
        BN c=*this/b;
        return *this-c*b;
    }
    BN operator%=(const BN &b) {
        *this=*this%b;
        return *this;
    }
};

int main(){
    BN a,b,c;
    a.read();
    b.read();

    //add test
    c=a+b;
    printf("a+b=");
    c.write();
    puts("");

    // sub test
    c=a-b;
    printf("a-b=");
    c.write();
    puts("");

    // mul test
    c=a*b;
    printf("a*b=");
    c.write();
    puts("");

    // div test
    c=a/b;
    printf("a/b=");
    c.write();
    puts("");

    // mod test
    c=a%b;
    printf("a%%b=");
    c.write();
    puts("");

    return 0;
}
```