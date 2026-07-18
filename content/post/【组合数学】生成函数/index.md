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

对于式子 $\sum a_n x^n$ 是有限项相加时，称为多项式；无限项相加时，称为幂级数。形式幂级数的意思就是 $x$ 的意义仅表示形式符号。    
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

复合运算同样满足结合律

$$
(f \circ g) \circ h= f \circ (g \circ h)
$$

## 泰勒展开

设函数 $f(x)$ 在包含 $x_0$ 的开区间有任意阶导数，我们希望把 $f(x)$ 写成幂级数的形式。
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
f^{(n)}(x_0)=n!c_n \\
\Longrightarrow c_n=\frac{f^{(n)}(x_0)}{n!}
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

### 一般形式对应的生成函数

$$
\begin{aligned}
(a+bx)^{\alpha} &= a^{\alpha}(1+\frac{b}{a}x)^{\alpha} \\
&= a^{\alpha}\sum_{n=0}^{\infty}\binom{\alpha}{n}\left ( \frac{b}{a} \right )^nx^n \\
&= \sum_{n=0}^{\infty}\binom{\alpha}{n} a^{\alpha-n}b^n x^n \\
\end{aligned}
$$

即

$$
[x^n](a+bx)^{\alpha}=\binom{\alpha}{n}a^{\alpha-n}b^n
$$


### 负指数的意义
当 $n$ 为正整数时
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

### 分数指数的意义

参考[后文](https://meze0.top/post/%E7%BB%84%E5%90%88%E6%95%B0%E5%AD%A6%E7%94%9F%E6%88%90%E5%87%BD%E6%95%B0/#%e5%8d%a1%e7%89%b9%e5%85%b0%e6%95%b0%e7%9a%84%e7%94%9f%e6%88%90%e5%87%bd%e6%95%b0)

## 普通生成函数（OGF）

### 封闭形式

对于序列 $\langle 1,1,1,\cdots\rangle$ 的生成函数 $f(x)$，满足如下方程
$$
f(x)x+1=f(x)
$$
解得 
$$
f(x)=\frac{1}{1-x}
$$
这就是 $f(x) $ 的封闭形式     
考虑序列 $\langle 1,p,p^2,\cdots\rangle$ 的生成函数 $f(x)$，其满足如下方程
$$
f(x)px+1=f(x)
$$
解得
$$
f(x)=\frac{1}{1-px}
$$
#### 例 1
> 序列 $\langle 0,1,1,1,1 \cdots \rangle$ 的形式幂级数和封闭形式

$$
f(x)x+x=f(x) \\
\Longrightarrow f(x)=\frac{x}{1-x}
$$

#### 例 2
> 序列 $\langle 1,0,1,0,1 \cdots \rangle$ 的形式幂级数和封闭形式

$$
f(x)x^2+1=f(x) \\
\Longrightarrow f(x)=\frac{1}{1-x^2}
$$

#### 例 3
> 序列 $\langle 0,1,2,3,4 \cdots \rangle$ 的形式幂级数和封闭形式

$$
\begin{aligned}
f(x) &= \sum_{k=0}^{\infty} (k+1)x^k \\
&= \sum_{k=1}^{\infty} kx^{k-1} \\
&= \left [ \sum_{k=0}^{\infty} x^k \right ]' \\
&= \frac{1}{(1-x)^2}
\end{aligned}
$$

#### 例 4
> 序列 $a_n=\binom{m}{n}$ 的形式幂级数和封闭形式，$n \ge 0$

$$
\begin{aligned}
f(x) &= \sum_{n=0}^{\infty} \binom{m}{n} x^n \\
&= (1+x)^m
\end{aligned}
$$

#### 例 5
> 序列 $a_n=\binom{m+n}{n}$ 的形式幂级数和封闭形式，$n \ge 0$

我们引入广义二项式得到

$$
\begin{aligned}
f(x) &= \sum_{n=0}^{\infty} \binom{m+n}{n}x^n \\
&= \sum_{n=0}^{\infty} \binom{m+1+n-1}{n} x^n \\
&= \sum_{n=0}^{\infty} (-1)^n \binom{-(m+1)}{n} x^n \\
&= (1-x)^{-(m+1)}
\end{aligned}
$$


### 斐波那契数列的生成函数

斐波那契数列定义为 $a_0=0,a_1=1,a_n=a_{n-1}+a_{n-2} \quad (n>1)$ 的数列，关于他的生成函数可以得到如下方程
$$
f(x)=xf(x)+x^2f(x)+x \\
\Longrightarrow  f(x)=\frac{x}{1-x-x^2}
$$
把它变成形式幂级数的形式，有两种方式
#### 方式一
$$
\begin{aligned}
f(x) &= \frac{x}{1-x-x^2} \\
&= x \cdot \frac{1}{1-(x+x^2)} \\
&= x \cdot \sum_{n=0}^{\infty} (x+x^2)^n\\
&= x \cdot \sum_{n=0}^{\infty} \sum_{k=0}^{n} \binom{n}{k} x^{(n-k)}x^{2k} \\
&= \sum_{n=0}^{\infty} \sum_{k=0}^{n} \binom{n}{k} x^{n+k+1} \\
&= \sum_{n=0}^{\infty} \sum_{k=0}^{\left \lfloor \frac{n-1}{2} \right \rfloor} \binom{n-k-1}{k} x^{n} \\
\end{aligned}
$$
因此
$$
a_n=\sum_{k=0}^{\left \lfloor \frac{n-1}{2} \right \rfloor} \binom{n-k-1}{k}
$$

#### 方式二

$$
\begin{aligned}
f(x) &= \frac{x}{1-x-x^2} \\
&= \frac{A}{1-ax}+\frac{B}{1+bx}  \\
&= \frac{\frac{1}{\sqrt{5}}}{1-\frac{1+\sqrt{5}}{2}x}-\frac{\frac{1}{\sqrt{5}}}{1-\frac{1-\sqrt{5}}{2}x} \\
&= \sum_{n=0}^{\infty}\frac{1}{\sqrt{5}} \left[ \left(\frac{1+\sqrt{5}}{2}\right)^n - \left(\frac{1-\sqrt{5}}{2}\right)^n \right]x^n
\end{aligned}
$$
于是 
$$
a_n=\frac{1}{\sqrt{5}} \left[ \left(\frac{1+\sqrt{5}}{2}\right)^n - \left(\frac{1-\sqrt{5}}{2}\right)^n \right]
$$

这个方式通用性强，若 $f(x)$ 和 $g(x)$ 是两个多项式，对于 $\frac{f(x)}{g(x)}$ 求解生成函数可采用上面这个方法。先求出 $g(x)$ 的所有根，然后把分母按照根拆开，若有重根，每有一个重根就多写一个分式，例如
$$
\begin{aligned}
f(x) &= \frac{1}{(1-x)(1-2x)^k} \\
&= \frac{c_1}{1-x}+\frac{c_2}{1-2x}+\frac{c_3}{(1-2x)^2}+\frac{c_4}{(1-2x)^3}+\cdots+\frac{c_{(k+1)}}{(1-2x)^k}
\end{aligned}
$$
求解分子的方法就是等式两边同时乘以原分母，再将特值代入 $x$ 求出分子。


### 卡特兰数的生成函数

卡特兰数的递推关系如下
$$
C_0=1 \\
C_n=\sum_{i=0}^{n-1} C_i C_{n-1-i} \quad (n \ge 1)
$$

其生成函数


$$
\begin{aligned}
f(x) &= \sum_{n=0}^{\infty}C_nx^n  \\
&=1+ \sum_{n=1}^{\infty} \left ( \sum_{i=0}^{n-1}C_iC_{n-i-1} \right ) x^n  \\
&=1+ x\sum_{n=1}^{\infty} \left ( \sum_{i=0}^{n-1}C_iC_{n-i-1} \right ) x^{n-1}  \\
&=1+ xf^2(x)\\
\end{aligned} \\
$$
于是我们得到了关于它的生成函数的方程
$$
xf^2(x)-f(x)+1=0 \\
\Longrightarrow f(x)=\frac{1 \pm \sqrt{1-4x}}{2x}
$$
因为 $\lim_{x \to 0} f(x) = C_0 = 1$ 必须满足，因此分子只能取减号

$$
f(x)=\frac{1-\sqrt{1-4x}}{2x} 
$$
考虑对 $\sqrt{1-4x}$ 进行广义二项式展开
$$
\begin{aligned} (1-4x)^{\frac{1}{2}} &= \sum_{k=0}^{\infty} \binom{\frac{1}{2}}{k} (-4x)^k \\ 
&= 1 + \sum_{k=1}^{\infty} \frac{\frac{1}{2} \cdot \left(-\frac{1}{2}\right) \cdot \left(-\frac{3}{2}\right) \cdots \left(\frac{1}{2} - k + 1\right)}{k!} (-1)^k 2^{2k} x^k \\ 
&= 1 + \sum_{k=1}^{\infty} \frac{(-1)^{k-1} \cdot 1 \cdot 3 \cdot 5 \cdots (2k-3)}{2^k \cdot k!} (-1)^k 2^{2k} x^k \\ 
&= 1 + \sum_{k=1}^{\infty} \frac{(-1)^{k-1} \cdot (2k-2)!}{2^k \cdot k! \cdot [2 \cdot 4 \cdot 6 \cdots (2k-2)]} (-1)^k 2^{2k} x^k \\ 
&= 1 + \sum_{k=1}^{\infty} \frac{(-1)^{k-1} \cdot (2k-2)!}{2^k \cdot k! \cdot 2^{k-1} \cdot (k-1)!} (-1)^k 2^{2k} x^k \\ 
&= 1 + \sum_{k=1}^{\infty} \frac{(-1)^{k-1}}{2^{2k-1} \cdot k} \cdot \frac{(2k-2)!}{(k-1)!(k-1)!} (-1)^k 2^{2k} x^k \\ 
&= 1 + \sum_{k=1}^{\infty} \frac{(-1)^{k-1}}{2^{2k-1} \cdot k} \binom{2k-2}{k-1} (-1)^k 2^{2k} x^k \\ 
&= 1 + \sum_{k=1}^{\infty} \frac{(-1)^{2k-1} \cdot 2^{2k}}{2^{2k-1} \cdot k} \binom{2k-2}{k-1} x^k \\ 
&= 1 - 2 \sum_{k=1}^{\infty} \frac{1}{k} \binom{2k-2}{k-1} x^k 
\end{aligned}
$$

代入原式得到

$$
\begin{aligned} 
f(x) &= \frac{1 - \left( 1 - 2 \sum_{k=1}^{\infty} \frac{1}{k} \binom{2k-2}{k-1} x^k \right)}{2x} \\ 
&= \frac{2 \sum_{k=1}^{\infty} \frac{1}{k} \binom{2k-2}{k-1} x^k}{2x} \\ 
&= \sum_{k=1}^{\infty} \frac{1}{k} \binom{2k-2}{k-1} x^{k-1}  \\
&= \sum_{n=0}^{\infty} \frac{1}{n+1} \binom{2n}{n} x^n
\end{aligned}
$$

于是得到 
$$
C_n= \frac{1}{n+1}\binom{2n}{n}
$$

以下就是一些应用

### [BZOJ3028 食物](https://www.luogu.com.cn/problem/P10780)

> 在许多不同种类的食物中选出 $n$ 个，每种食物的限制如下：
> 1. 承德汉堡：偶数个；
> 2. 可乐：$0$ 个或 $1$ 个；
> 3. 鸡腿：$0$ 个，$1$ 个或 $2$ 个；
> 4. 蜜桃多：奇数个；
> 5. 鸡块：$4$ 的倍数个；
> 6. 包子：$0$ 个，$1$ 个，$2$ 个或 $3$ 个；
> 7. 土豆片炒肉：不超过一个；
> 8. 面包：$3$ 的倍数个；   
> 
> 每种食物都是以「个」为单位，只要总数加起来是 $n$ 就算一种方案．对于给出的 $n$ 你需要计算出方案数，对 $10007$ 取模．

把每种食物的所有可能取值以生成函数中的幂的形式呈现，最后全部相乘得到 $f(x)$，答案就是 $[x^n]f(x)$，如下

1. $\sum_{n \ge 0} x^{2n} = \frac{1}{1-x^2}$ 
2. $1+x$
3. $1+x+x^2=\frac{1-x^3}{1-x}$
4. $\sum_{n \ge 0} x^{2n+1} = \frac{x}{1-x^2}$
5. $\sum_{n \ge 0} x^{4n} = \frac{1}{1-x^4}$
6. $1+x+x^2+x^3=\frac{1-x^4}{1-x}$
7. $1+x$
8. $\sum_{n \ge 0} x^{3n} = \frac{1}{1-x^3}$

全部相乘得到

$$
\begin{aligned}
F(x) &= \frac{(1+x)(1-x^3)x(1-x^4)(1+x)}{(1-x^2)(1-x)(1-x^2)(1-x^4)(1-x)(1-x^3)} \\
&= \frac{x}{(1-x)^4} \\
&= x \sum_{n=0}^{\infty}\binom{-4}{n}(-1)^n x^n  \\
&= \sum_{n=0}^{\infty}\binom{4+n-1}{n} x^{n+1} \\
&= \sum_{n=1}^{\infty}\binom{n+2}{3} x^{n}
\end{aligned}
$$

因此答案就是
$$
\text{Ans}=[x^n]f(x)=\binom{n+2}{3}
$$

### 小蓝本例4

> 一副三色牌，共有纸牌 $32$ 张，其中红、黄、蓝每种颜色的牌各 $10$ 张，编号分别是 $1, 2, \cdots, 10$；另有大、小王牌各一张，编号均为 $0$，从这副牌中任取若干张牌，然后按如下规则计算分值：每张编号为 $k$ 的牌计为 $2^k$ 分. 若它们的分值之和为 $n$（$n \leqslant 2020$ 为给定的正整数），就称这些牌为一个“好”牌组。     
> 
> 试求“好”牌组的个数。


### [「CEOI2004」Sweet](https://www.luogu.com.cn/problem/P6078?lang=zh-cn)



### 小蓝本例1

### 小蓝本例2

### 小蓝本例3