---
title: "CF div2 做题记录"
description: "Cf Div2 做题记录"
date: 2026-03-01T17:51:34+08:00
math: true
categories:
    - 记录（OI与数学）
tags:
    - 题解
---

## [CF2253](https://codeforces.com/contest/2253)

### [A. The Best Card](https://codeforces.com/contest/2253/problem/A)

首先不能是前 $n-1$ 个数，因为这个数 $k$ 在 $k+1$ 面前一定输，然后就是第 $n$ 个数，只有当 $n+1$ 是质数时，满足题意，如果不是质数说明有质因子，且一定比他小，所以他会输。使用欧拉筛即可

### [B. Hypercarp and the Control Panel](https://codeforces.com/contest/2253/problem/B)

把相邻相同的数合并，以 $(b_k,c_k)$ 的形式呈现（$b_k$ 表示颜色，$c_k$ 表示个数），如果说最终有 $k$ 组，那么答案只能 $k$、$k+1$ 或 $k+2$。分类讨论即可。

### [C. Sum of Distinct Values in a Matrix](https://codeforces.com/contest/2253/problem/C)

我们考虑怎么操作出不同数量最多的矩阵，再考虑怎么把这 $x+y$ 个数填进去，注意到矩阵最多有 $n+m-1$ 个不同的数。只需从大到小加起来并且不违反条件即可。

## [CF2256](https://codeforces.com/contest/2256)

### [A. Three Numbers on the Blackboard](https://codeforces.com/contest/2256/problem/A)

只需留意最大的数是否大于另外两数相加。简单题。

### [B. Domino Tiles](https://codeforces.com/contest/2256/problem/B)

注意到 $s_i \ne s_{i+2}$，若 $s_i$ 确定，与 $i$ 共奇偶的位置就能确定，若奇数位（或偶数位）上全是问号，有 $2$ 种填充方式。因此答案为 $0$、$2$ 或 $4$。还有一种特殊情况就是不用填，答案是 $1$。

### [C. Hot Potatoes at the Fairy Warehouse](https://codeforces.com/contest/2256/problem/C)

前 $k-1$ 轮双方没有理由行动。在第 $k$ 轮，双方都会能传就传。    
为什么？如果提前传，相当于提前把这颗土豆的控制权交给对手；而你完全可以等到最后一轮再传。

### [D. A Ribbon for Tomorrow](https://codeforces.com/contest/2256/problem/D)

这是计数转化的好题，挖掘这个操作的性质。   
注意到如果将字符串看作 `01` 连续段，任意操作都无法改变连续段的结构，只能改变每个段内的个数。     
再次注意到在保证 `01` 个数不变的情况下，每个段内的数字可以是任意多个（不小于 $1$，不大于整体范围）。于是利用插板法完美解决

$$
\boxed{\binom{c_0-1}{r_0-1}\binom{c_1-1}{r_1-1}}
$$
$c_0,c_1$：0 和 1 的总个数。
$r_0,r_1$：0 段和 1 段的个数。