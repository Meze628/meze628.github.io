---
title: "【组合数学】容斥原理与二项式反演"
description: "容斥原理、子集反演、二项式反演、"
date: 2026-07-14T20:43:00+08:00
math: true
categories:
    - 组合数学笔记
tags:
    - 组合数学
---

## 容斥原理

### 定义

对于 $n$ 个有限集合 $A_i$，对集合求并集并计数，有如下式子：

$$
\left |  \bigcup_{i=1}^{n} A_i \right |=\sum_{\emptyset \ne T \subseteq \left \{ 1,2, \cdots , n \right \}} (-1)^{|T|-1} \left | \bigcap_{k \in T} A_k\right |
$$

### 证明

考虑每个元素被计数了几次，对于任意一个元素 $x$，假设它在集合 $T_1,T_2, \cdots , T_m$ 当中均出现过，那么 $x$ 被计的次数是 $\text{cnt}_x$

$$
\begin{aligned}

\text{cnt}_x &= \sum_{\emptyset \ne S \subseteq \left \{ 1,2,\cdots,m \right \}} (-1)^{|S|-1} \cdot 1 \\


&=\sum_{i=1}^{m} (-1)^{i-1} \binom{m}{i}  \\

&=1

\end{aligned}
$$

由此可见每一个元素在容斥原理的计算过程中只被计算了一次，因此成立。

### 补集

如果算是交集计数呢，相当于全集减去补集的并集再计数

$$
\begin{aligned}
\left | \bigcap_{i=1}^{n} A_i\right | &= |U|- \left | \bigcup_{i=1}^{n} \overline{A_i} \right |  \\
&=\sum_{T \subseteq \left \{ 1,2, \cdots , n \right \}} (-1)^{|T|} \left | \bigcap_{k \in T} \overline{A_k}\right |
\end{aligned}
$$

### 不定方程非负整数解计数

$$
\sum_{i=1}^{m}x_i=n
$$

对于如上方程给出限制 $x_i \ge a_i$，可以使用插板法解决，如果限制变成了 $0 \le x_i \le a_i$，考虑容斥原理。     
设全集 $U$ 表示所有非负整数解，集合 $A_i$ 表示满足 $x_i \le a_i$ 的所有解，答案就是 $\left |\bigcap_{i=1}^{m} A_i \right |$。

$$
\begin{aligned}
\left |\bigcap_{i=1}^{m} A_i \right | &= |U| - \left | \bigcup_{i=1}^{m} \overline{A_{i}} \right | \\
&=\sum_{T \subseteq \left \{ 1,2, \cdots , m \right \}} (-1)^{|T|} \left | \bigcap_{k \in T} \overline{A_k}\right |
\end{aligned}
$$

若干 $\overline{A_i}$ 的交集表示满足若干个 $x_i \ge a_i+1$ 的所有解，利用插板法解决

$$
=\sum_{T \subseteq \left \{ 1,2, \cdots , m \right \}} (-1)^{|T|} \binom{n-\sum_{k \in T}(a_k+1)+m-1}{m-1}
$$

### [[HAOI2008] 硬币购物](https://www.luogu.com.cn/problem/P1450)
可以用多重背包来写，但是时间复杂度会超。题目本质是求 $0 \le x_i \le d_i$ 的如下方程的解的个数
$$
\sum_{i=1}^{4}c_ix_i=s
$$
当没有限制时，显然可以用完全背包来做，令 $dp_s$ 表示价格是 $s$ 时不考虑限制的方案数。预处理出这个 dp 数组，答案就是：

$$
\begin{aligned}
\text{Ans} &= dp_s-\sum_{\emptyset \ne T \subseteq \left \{1,2,3,4 \right \}}(-1)^{|T|-1}dp_{s-\sum_{i \in T} c_i(d_i+1)} \\
&=\sum_{T \subseteq \left \{1,2,3,4 \right \}}(-1)^{|T|}dp_{s-\sum_{i \in T} c_i(d_i+1)}
\end{aligned}
$$

## 子集反演

对于两个集合函数，若

$$
f(S)=\sum_{T \subseteq S} g(T)
$$

则有

$$
g(S)=\sum_{T \subseteq S}(-1)^{|S|-|T|}f(T)
$$

我们将子集当作元素，这实际上是对子集的容斥。证明如下

$$
\begin{aligned}
\sum_{T \subseteq S}(-1)^{|S|-|T|}f(T) &=\sum_{T \subseteq S}(-1)^{|S|-|T|} \sum_{Q \subseteq T} g(Q) \\

&= \sum_{Q \subseteq S} g(Q) \sum_{Q \subseteq T \subseteq S }(-1)^{|S|-|T|}  \\

&= \sum_{Q \subseteq S} g(Q) \sum_{T \subseteq (S \setminus Q)}(-1)^{|(S \setminus Q)|-|T|}  \\

&= \sum_{Q \subseteq S} g(Q) \sum_{i=0}^{|S \setminus Q|} \binom{|S \setminus Q|}{i}(-1)^i \\

&= \sum_{Q \subseteq S} g(Q) \cdot [|S \setminus Q|=0] \\

&=g(S)

\end{aligned}
$$

## 超集反演
将子集反演中的集合全部换成补集，即可得到超集反演，若
$$
f(S)=\sum_{S \subseteq T} g(T)
$$
则有
$$
g(S)=\sum_{S \subseteq T} (-1)^{|T|-|S|} f(T)
$$

## 二项式反演形式一（子集反演推论）

二项式反演的这个形式是子集反演的推论，如果子集反演中的集合函数只与集合中元素个数有关，即可得到这个形式，具体的，如果 $f(x)$ 表示至多满足 $x$ 个限制的方案数，$g(x)$ 表示恰好满足 $x$ 个限制的方案数，则有
$$
f(x)=\sum_{i=0}^{x} \binom{x}{i} g(i)
$$

于是有

$$
g(x)=\sum_{i=0}^{x} (-1)^{x-i} \binom{x}{i} f(i)
$$

### [[JSOI2015] 染色问题](https://www.luogu.com.cn/problem/P6076)

最终要求满足 $C$ 个颜色均出现的方案数，我们令 $f(x)$ 表示至多出现 $x$ 个颜色的方案数，$g(x)$ 表示恰好出现 $x$ 个颜色的方案数。在此基础上，我们必须满足条件（2）和条件（3），于是有

$$
\begin{aligned}
f(x) &= \sum_{T \subseteq \left \{ 1,2,\cdots,m \right \}}(-1)^{|T|}[(x+1)^{m-|T|}-1]^n \\
&= \sum_{i=0}^{m}(-1)^{i}\binom{m}{i}[(x+1)^{m-i}-1]^n
\end{aligned}
$$
由二项式反演得到如下式子
$$
f(x)=\sum_{i=0}^{x}\binom{x}{i}g(i)
$$
于是有
$$
\begin{aligned}
g(x) &= \sum_{i=0}^{x}(-1)^{x-i}\binom{x}{i}f(i) \\
&= \sum_{i=0}^{x}\sum_{j=0}^{m}(-1)^{x-i+j}\binom{x}{i} \binom{m}{j} [(i+1)^{m-j}-1]^n
\end{aligned}
$$
代入 $x=c$ 得到答案
$$
Ans=\sum_{i=0}^{c}\sum_{j=0}^{m}(-1)^{c-i+j}\binom{c}{i} \binom{m}{j} [(i+1)^{m-j}-1]^n
$$

## 二项式反演形式二（超集反演推论）

二项式反演的这个形式是超集反演的推论，具体的，共有 $n$ 个限制，如果 $f(x)$ 表示「钦定」 $x$ 个限制的方案数，$g(x)$ 表示恰好满足 $x$ 个限制的方案数，则有
$$
f(x)=\sum_{i=x}^{n} \binom{i}{x} g(i)
$$

于是有

$$
g(x)=\sum_{i=x}^{n} (-1)^{i-x} \binom{i}{x} f(i)
$$

### [集合计数](https://www.luogu.com.cn/problem/P10596)
题目要求计算：从大小为 $n$ 的集合 $S$ 中选出若干个不同的子集，使得这些子集的交集大小恰好为 $k$ 的方案数。考虑二项式反演，令 $f(x)$ 表示「钦定」交集的大小为 $x$ 的集合的方案数，则有

$$
f(x)=\binom{n}{x}(2^{2^{n-x}}-1)
$$

解释一下，满足大小为 $x$ 的情况有 $\binom{n}{x}$ 个元素，剩余可以选 $2^{n-x}$ 个集合，其子集有 $2^{2^{n-x}}$ 个集合，但有一个是空集，减去一个 $1$ 即可。令 $g(x)$ 表示交集大小恰好为 $x$ 的方案数，则有

$$
g(x)=\sum_{i=x}^{n} (-1)^{i-x}\binom{i}{x}f(i)
$$
将 $f(x)$ 代入原式，$g(k)$ 即为最终答案

$$
Ans=\sum_{i=k}^{n} (-1)^{i-k}\binom{n}{i} \binom{i}{k}(2^{2^{n-i}}-1)
$$

在计算 $2^{2^{n-i}} \mod P$ 时，需要用到**扩展欧拉定理**，即 $2^{2^{n-i}} \equiv 2^{2^{n-i} \mod (P-1)} \pmod{P}$

## 二项式反演——形式三
这个式子在题目中体现较少，可以转换成另外两个形式
$$
f(n) = \sum_{i=0}^n (-1)^i \binom{n}{i} g(i) \iff g(n) = \sum_{i=0}^n (-1)^i \binom{n}{i} f(i)
$$
