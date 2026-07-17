---
title: "【组合数学】生成函数"
description: "生成函数简介、泰勒展开、广义二项式、普通生成函数（OGF）、指数生成函数（EGF）和概率生成函数（PGF）"
date: 2026-07-17T18:39:00+08:00
math: true
categories:
    - 组合数学笔记
tags:
    - 组合数学
---

## 生成函数简介

对于式子 $\sum a_n x_n$ 是有限项相加时，称为多项式；无限项相加时，称为幂级数。形式幂级数的意思就是 $x$ 的意义仅表示形式符号。    
生成函数本质上是形式幂级数或者多项式，对于序列 $\langle a_0,a_1,a_2,\cdots \rangle$，它的生成函数是
$$
f(x)=a_0+a_1x+a_2x^2+\cdots
$$
定义 $[x^i]f(x)$ 表示在 $f(x)$ 的展开式中 $x^i$ 的系数，即 $[x^i]f(x)=a_i$。对于两个序列的生成函数，有加法、乘法（卷积）、逆元和复合等运算。设这两个生成函数是
$$
f(x)=a_0+a_1x+a_2x^2+\cdots=\sum_{i=0}^{\infty}a_ix^i
$$

$$
g(x)=b_0+b_1x+b_2x^2+\cdots=\sum_{i=0}^{\infty}b_ix^i
$$
### 加法

$$
f(x)+g(x)=\sum_{i=0}^{\infty}(a_i+b_i)x^i
$$

加法运算满足交换律和结合律

### 乘法（卷积）

$$
f(x) \cdot g(x)=\sum_{n=0}^{\infty} \left ( \sum_{i=0}^{n}a_i b_{n-i}\right )x^n
$$

乘法运算满足交换律、结合律和分配律

### 逆元

若 $f(x)g(x)=1$，则称 $g(x)$ 是 $f(x)$ 的逆元，记作 $g(x)=f^{-1}(x)$     
存在性定理：$f(x)$ 存在逆元的充要条件是常数项不为 $0$。

### 复合
复合函数 $f(g(x))$ 存在必须满足 $f(x)$ 是多项式或者 $g(0)=0$.

$$
f \circ g=f(g(x))=\sum_{i=0}^{\infty} a_ig^i(x)
$$


## 泰勒展开

设函数 $f(x)$ 在包含 $x_0$ 处的开区间有任意阶导数，我们希望把 $f(x)$ 写成幂级数的形式。
$$
f(x)=c_0+c_1(x-x_0)+c_2(x-x_0)^2+ \cdots
$$
可以看出 $f(x_0)=c_0$，对 $f(x)$ 求导得到
$$
\begin{aligned}
f'(x) &= c_1+2c_2(x-x_0)+3c_3(x-x_0)^2+ \cdots \\
f^{(n)}(x) &= n!c_n+(n+1)!c_{n+1}(x-x_0)+ \cdots
\end{aligned}
$$
将 $x=x_0$ 代入得到
$$
f^{(n)}(x_0)=n!c_n
$$

$$
c_n=\frac{f^{(n)}(x_0)}{n!}
$$
于是即可得到 $f(x)$ 的泰勒展开
$$
f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(x_0)}{n!} (x - x_0)^n
$$
当 $x_0=0$ 时，称为麦克劳林展开
$$
f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(0)}{n!} x^n
$$

## 广义二项式
### 广义二项式系数
一般的组合数都要求两个参数都是非负整数，而广义二项式系数则可以要求上面的数是实数，如下：

$$
\binom{\alpha}{k} = \frac{\alpha^{\underline{k}}}{k!} = \frac{\alpha(\alpha-1)(\alpha-2)\cdots(\alpha-k+1)}{k!}
$$

特别地，当 $k=0$ 时，规定 $\binom{\alpha}{0} = 1$；当 $k < 0$ 时，$\binom{\alpha}{k} = 0$。

### 广义二项式定理
对于实数 $\alpha$ 和 $|x|<1$（保证等式右侧无穷级数收敛），有
$$
(1+x)^{\alpha}=\sum_{k=0}^{\infty}\binom{\alpha}{k}x^{k}
$$
在此基础上进行推广得到如下，其中 $|x|<|y|$

$$
\begin{aligned}
(x+y)^{\alpha} &= y^{\alpha}(1+\frac{x}{y})^{\alpha} \\
&= y^{\alpha}\sum_{k=0}^{\infty}\binom{\alpha}{k}\left ( \frac{x}{y} \right )^k \\
&= \sum_{k=0}^{\infty} \binom{\alpha}{k}x^k y^{\alpha-k}
\end{aligned} 
$$

#### 证明
广义二项式定理本质是对 $(1+x)^{\alpha}$ 进行麦克劳林展开

$$
\begin{aligned}
(1+x)^{\alpha} &= \sum_{k=0}^{\infty}\frac{f^{(k)}(0)}{k!} x^k \\
&= \sum_{k=0}^{\infty}\frac{\alpha^{\underline{k}}}{k!} x^k \\
&= \sum_{k=0}^{\infty} \binom{\alpha}{k} x^k \\
\end{aligned}
$$


### 负指数的意义
当 $n$ 正整数时
$$
\binom{-n}{k} = \frac{-n(-n-1)\cdots(-n-k+1)}{k!} = (-1)^k \frac{n(n+1)\cdots(n+k-1)}{k!} = (-1)^k \binom{n+k-1}{k}
$$
可以推导生成函数的展开式
$$
\begin{aligned}
(1-x)^{-n} &= \sum_{k=0}^{\infty} \binom{-n}{k} (-x)^k \\
&= \sum_{k=0}^{\infty} (-1)^k \binom{n+k-1}{k} (-1)^k x^k \\
&= \sum_{k=0}^{\infty} \binom{n+k-1}{k} x^k
\end{aligned}
$$