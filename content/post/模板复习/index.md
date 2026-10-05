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

### 桥、边双连通分量

### 割点、点双连通分量

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

## 数据结构

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

## 数学

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