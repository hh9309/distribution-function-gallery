import { DistributionInfo } from "../types";

export const distributions: DistributionInfo[] = [
  {
    type: "Normal",
    nameCH: "正态分布 (Normal)",
    typeCH: "连续型",
    formulaPDF: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}",
    formulaCDF: "F(x) = \\frac{1}{2}\\left[1 + \\text{erf}\\left(\\frac{x-\\mu}{\\sigma\\sqrt{2}}\\right)\\right]",
    pdfLabel: "概率密度 (PDF)",
    description: "正态分布（高斯分布）是自然界和人类社会中最重要、最常见的概率分布。由于中心极限定理的作用，大量微小、独立的随机变量相加后的结果往往逼近正态分布。其曲线呈关于均值对称的钟形，俗称“钟形曲线”。",
    parameters: [
      {
        name: "mu",
        label: "均值 (μ / mu)",
        min: -10,
        max: 10,
        step: 0.5,
        defaultValue: 0,
        description: "决定分布曲线的中心对称位置。移动该参数，整个曲线在X轴上平移。"
      },
      {
        name: "sigma",
        label: "标准差 (σ / sigma)",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 1,
        description: "决定分布的离散程度和胖瘦。标准差越小曲线越尖锐高耸，标准差越大曲线越矮胖平缓。"
      }
    ],
    examples: [
      {
        title: "成年男子身高",
        scenario: "某国成年男子身高平均约为 175 cm，标准差为 6 cm。由于遗传等多种微小因子综合作用，身高极度符合正态分布。测量值大多落在 163-187 cm (即±2σ) 内。",
        parameterExplanation: "μ = 175 代表平均身高，σ = 6 代表个体间差异波动。"
      },
      {
        title: "考试批改误差/测量误差",
        scenario: "工业精密测量或科学测绘中，温度和仪器抖动等导致测量结果产生微小偏离，这一偏离大多呈现在 0 附近波动的正态性质。",
        parameterExplanation: "μ = 0 代表无刻度系统偏差，σ 表示测量仪器的精密程度（越小越精确）。"
      },
      {
        title: "智商分数 (IQ)",
        scenario: "智力测试在设计时被标准化为均值 100，标准差 15。根据统计，约 68% 的人智商集中在 85 到 115 之间，而超过 130 的属于极少数天才。",
        parameterExplanation: "μ = 100 是常态刻度的中点，σ = 15 定义了高低智商的距离跨度。"
      }
    ],
    presets: [
      {
        title: "标准正态分布 (Standard Normal)",
        description: "数学家与统计学家最喜爱的标准模型，均值为 0，标准差为 1。所有其他正态分布均可通过 Z-Score 变化平移缩放为此状态。",
        params: { mu: 0, sigma: 1 },
        focusExplanation: "观察：最高点在 x=0 处，高约 0.4。曲线拐点精确出现在 x = -1 和 x = 1 位置。"
      },
      {
        title: "高精度窄波动 (High Precision)",
        description: "标准差减小为 0.5。意味着随机不确定性极低，测量值牢牢抱团在中心均值周围。",
        params: { mu: 0, sigma: 0.5 },
        focusExplanation: "观察：中心峰值瞬间冲高（达到 0.8 以上），但两翼以极快的速度收窄。这表示高确定性。"
      },
      {
        title: "低精度扁平散布 (High Variance)",
        description: "标准差放大为 3.0。随机波动非常剧烈，测量偏离中值很远的情况也很常见。",
        params: { mu: 0, sigma: 3 },
        focusExplanation: "观察：曲线变成扁平宽广的矮坡，峰值只有 0.13 左右，表示数据可能散落在很宽的量域内。"
      }
    ],
    stats: (params) => {
      const { mu, sigma } = params;
      return {
        mean: mu,
        variance: sigma * sigma,
        skewness: 0,
        kurtosis: 3
      };
    }
  },
  {
    type: "Binomial",
    nameCH: "二项分布 (Binomial)",
    typeCH: "离散型",
    formulaPDF: "P(X=k) = \\binom{n}{k} p^k (1-p)^{n-k}",
    formulaCDF: "F(x) = \\sum_{i=0}^{\\lfloor x \\rfloor} \\binom{n}{i} p^i (1-p)^{n-i}",
    pdfLabel: "概率质量 (PMF)",
    description: "二项分布描述了在 n 次独立的、只包含“成功”或“失败”的重复伯努利试验中，成功次数 X 的概率分布。经典例子是扔 n 次硬币，得到正面朝上的次数。",
    parameters: [
      {
        name: "n",
        label: "试验次数 (n)",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 20,
        description: "独立进行重复试验的次数，必须为正整数。"
      },
      {
        name: "p",
        label: "单次成功概率 (p)",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
        description: "每次单独试验中“成功”发生的概率。"
      }
    ],
    examples: [
      {
        title: "抛掷硬币试验",
        scenario: "连续独立抛掷 20 次均匀的一元硬币，正面朝上出现的次数符合二项分布。最容易出现的是 10 次正面，而 0 次或 20 次正面的概率极小。",
        parameterExplanation: "试验次数 n = 20，硬币质地均匀则 p = 0.5。"
      },
      {
        title: "工业出厂缺陷检验",
        scenario: "某流水线电子原件有 3% 的天然生产缺陷率。质检员随机抽取 50 个原件测试，发现不合格品个数 X 的范围符合二项分布。",
        parameterExplanation: "抽检样本数 n = 50，原件不合格单件概率 p = 0.03。"
      },
      {
        title: "电话销售群呼转化",
        scenario: "一名销售顾问拨打 30 个意向客户电话，如果历史转化率是 20%，那么他今天成功签单 0 到 30 个客户的可能散布即是二项式模型。",
        parameterExplanation: "总拨打次数 n = 30，每个客户决定成交的单体概率 p = 0.20。"
      }
    ],
    presets: [
      {
        title: "经典对称二项分布",
        description: "最标准对称的离散钟形分布。抛掷 20 次硬币的正反面次数极好地演示了这一点，均值在中心点 10 处。",
        params: { n: 20, p: 0.5 },
        focusExplanation: "观察：柱状图在 x=10 处最高，向两边逐渐对称衰减。离散点完全呈现正态对称的轮廓。"
      },
      {
        title: "稀有事件极右偏 skewness",
        description: "当单次成功率极低（如 p=0.05，在 50 次实验中），绝大多数轮次我们都只能成功 1~3 次，分布呈现极端向右拖尾。",
        params: { n: 50, p: 0.05 },
        focusExplanation: "观察：柱子完全扎堆在 x=0, 1, 2, 3，随后往右陡峭滑落，展现出正偏态（Skewed Right）的稀有性。"
      },
      {
        title: "大概率超高成功极左偏",
        description: "试验单次转化高达 85% 时，在 40 次尝试里拿不到 34次以上成功才叫罕见，分布顶峰大幅度被推挤到最右侧。",
        params: { n: 40, p: 0.85 },
        focusExplanation: "观察：由于顶部贴紧最右边缘并急刹车，左边长尾缓慢滑坡，这是负偏态（Skewed Left）。"
      }
    ],
    stats: (params) => {
      const { n, p } = params;
      const q = 1 - p;
      const den = Math.sqrt(n * p * q);
      return {
        mean: n * p,
        variance: n * p * q,
        skewness: den > 0 ? (q - p) / den : 0,
        kurtosis: den > 0 ? 3 + (1 - 6 * p * q) / (n * p * q) : 0
      };
    }
  },
  {
    type: "Poisson",
    nameCH: "泊松分布 (Poisson)",
    typeCH: "离散型",
    formulaPDF: "P(X=k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}",
    formulaCDF: "F(x) = e^{-\\lambda} \\sum_{i=0}^{\\lfloor x \\rfloor} \\frac{\\lambda^i}{i!}",
    pdfLabel: "概率质量 (PMF)",
    description: "泊松分布适用于描述在特定时间段或空间区域内，发生次数 X 的概率。这些事件在时间或空间上是相互独立、以固定平均速率 λ 随机发生的（例如：一小时内涌入客服的热线数）。",
    parameters: [
      {
        name: "lambda",
        label: "平均发生率 (λ / lambda)",
        min: 0.1,
        max: 30,
        step: 0.5,
        defaultValue: 4,
        description: "单位时空区间内，事件发生的平均次数。λ 既是该分布的均值，也是变异的方差。"
      }
    ],
    examples: [
      {
        title: "网站服务器每秒请求数",
        scenario: "某电商系统每秒通常平均接收到 5 次外部 API 刷新。此时特定某一秒可能进来 0、2、5 甚至 12 个请求，该数量波动完全符合泊松定律。",
        parameterExplanation: "λ = 5 表示平均并发，高算力弹性扩容时常以此设计高分位应对冗余。"
      },
      {
        title: "急诊室夜间接收患者",
        scenario: "社区医院在凌晨 2点到 3点之间，因各种突发症状就诊的患者人数波动。由于每个人发病是独立偶发的，符合泊松事件流。",
        parameterExplanation: "若历史平均有 3.5 人入院，则 λ = 3.5。我们可以评估超过 8 个患者突然涌入挤爆医疗床位的极值概率。"
      },
      {
        title: "巧克力曲奇上的碎屑数",
        scenario: "面包店制作一批含有大量碎片的曲奇。平均每只曲奇分配到 8 颗小豆，顾客买到一块曲奇，其上面含有的红豆数是泊松空间散步。",
        parameterExplanation: "λ = 8。我们可以看到有些幸运曲奇有 15 颗，有的倒霉的却一个红豆都没有。"
      }
    ],
    presets: [
      {
        title: "稀疏罕见泊松 (Rare Event Flow)",
        description: "均值 λ 很小（如 1.5）。类似某高危事故率。最有可能发生 0 或 1 次，往右衰退极快。",
        params: { lambda: 1.5 },
        focusExplanation: "观察：在 0, 1, 2 位置之后出现一落千丈的曲线段。这说明大多数时候事件保持安静不发生。"
      },
      {
        title: "中等负荷状态 (Medium Inflow)",
        description: "均值 λ = 5.0。中大峰度，开始体现出左右起伏的丘陵状。但右方仍然拖着长长的松散尾数。",
        params: { lambda: 5 },
        focusExplanation: "观察：峰值不再是 0 处，而是向右漂移到 4 和 5 上，两端开始有点像偏态的钟形。"
      },
      {
        title: "密集连续大数逼近 (Normal Approximation)",
        description: "均值 λ = 18.0。随着λ增大，泊松分布的峰值不断右移，离散图呈现出极度接近连续正态分布的平滑对称钟形。",
        params: { lambda: 18 },
        focusExplanation: "观察：可以极为直观地看到一个几乎完美的对称钟形框架。这是概率论中“泊松分布趋于正态分布”的动态显现！"
      }
    ],
    stats: (params) => {
      const { lambda } = params;
      return {
        mean: lambda,
        variance: lambda,
        skewness: 1 / Math.sqrt(lambda),
        kurtosis: 3 + 1 / lambda
      };
    }
  },
  {
    type: "Exponential",
    nameCH: "指数分布 (Exponential)",
    typeCH: "连续型",
    formulaPDF: "f(x) = \\lambda e^{-\\lambda x} \\quad (x \\ge 0)",
    formulaCDF: "F(x) = 1 - e^{-\\lambda x} \\quad (x \\ge 0)",
    pdfLabel: "概率密度 (PDF)",
    description: "指数分布用来表示独立随机事件发生的**等待间隔时间**（如在公交站等车、两次突发地震的前后间隔）。指数分布拥有极其独特的**无记忆性**（Memoryless Property）。",
    parameters: [
      {
        name: "lambda",
        label: "事件速率 (λ / lambda)",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 1,
        description: "事件单位时间平均发生率。λ越大代表事件发生得越频繁，因此前后两次发生的间隔（即等待时间）就越短。"
      }
    ],
    examples: [
      {
        title: "银行网点排队等待服务",
        scenario: "在窗口接受完前一个人的服务后，下一个人的间隔到达时间。如果客户以平均每分钟 0.5 人的频率进入，等待下一个人的时长服从指数规律。",
        parameterExplanation: "λ = 0.5 代表平均每分钟来 0.5 人。平均等待时间 θ = 1/λ = 2 分钟。"
      },
      {
        title: "电子产品使用寿命",
        scenario: "某半导体内存条在没有磨损损耗的随机偶发击穿失效背景下，其正常稳定工作寿命服从指数分布。无记忆性保障了用过 1年和用过 3年它在下个月坏掉几率并无差异。",
        parameterExplanation: "λ 是故障失效率，倒数就是平均无故障工作时间 (MTBF)。"
      }
    ],
    presets: [
      {
        title: "超快到期速率 (Fast Event Pace)",
        description: "λ 设为 2.5 意味着单位时间有 2.5 次事件（频繁至极）。大部分间隔极短，曲线起跑即迅速下坠，紧贴 Y 轴。",
        params: { lambda: 2.5 },
        focusExplanation: "观察：x 坐标极小处就聚集了超高的 PDF，表示几乎极少有长久的等待，事件像爆米花一样一个接一个地炸裂。"
      },
      {
        title: "漫长等待拉松 (Long-Drawn Expectation)",
        description: "λ 降低为 0.2（平均需要 5 个时间单位才来一个事件）。等待区间变得极为宽广，衰退缓慢，一直平移向右拉伸延伸。",
        params: { lambda: 0.2 },
        focusExplanation: "观察：起点仅为 0.2，斜率极为平坦，拖长出的“无尽之尾”直观地诠释了高概率长时间干等的情景。"
      }
    ],
    stats: (params) => {
      const { lambda } = params;
      return {
        mean: 1 / lambda,
        variance: 1 / (lambda * lambda),
        skewness: 2,
        kurtosis: 9
      };
    }
  },
  {
    type: "Gamma",
    nameCH: "Gamma 分布 (Gamma)",
    typeCH: "连续型",
    formulaPDF: "f(x) = \\frac{\\beta^\\alpha}{\\Gamma(\\alpha)} x^{\\alpha-1} e^{-\\beta x} \\quad (x > 0)",
    formulaCDF: "F(x) = \\frac{\\gamma(\\alpha, \\beta x)}{\\Gamma(\\alpha)}",
    pdfLabel: "概率密度 (PDF)",
    description: "Gamma分布是指数分布的扩展。如果说指数分布是在等『第一起』泊松事件，那么Gamma分布描述的就是要等齐『第 α 起』事件共计累积花掉的时间总和。在水文降水量分析、排队系统、金融保费中应用深广。",
    parameters: [
      {
        name: "alpha",
        label: "形状参数 (α / shape)",
        min: 0.1,
        max: 10,
        step: 0.2,
        defaultValue: 2,
        description: "代表我们想要等齐的事件数。当它大于1时，x=0 处的概率变为 0 且随着它增大，峰度从起航指数形态往右偏移进化。"
      },
      {
        name: "beta",
        label: "尺度倒数/速率 (β / rate)",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 1,
        description: "发生单个事件的速率。β越大表示单个事件累积得越快，导致总等待时间向左压缩。"
      }
    ],
    examples: [
      {
        title: "连续完成三项独立任务",
        scenario: "开发一个软件模块，必须完成 3个串联的、平均耗时 1个工时的指数型子任务。那么这个模块最终在特定时间完工耗时服从 Gamma 分布。",
        parameterExplanation: "α = 3 代表 3 个阶段，如果每个阶段平均速率为 β = 1.0。"
      },
      {
        title: "水动力学年降水量累积",
        scenario: "流域水文学家测量一季的总暴雨量。常使用 Gamma 作为偏态拟合概率，它可以很好的适配那些由于多数少量与偶尔超特大降雨掺杂而导致的右偏分布特征。",
        parameterExplanation: "调整 α 与 β 用以精准贴和测站历史干旱与极端暴雨分位数。"
      }
    ],
    presets: [
      {
        title: "当等同于指数分布 (Alpha = 1)",
        description: "当形状参数 α 设为 1，意思即只管等待第一起事件。在数学上此时 Gamma(1, β) 等价于 Exponential(β)。",
        params: { alpha: 1, beta: 1 },
        focusExplanation: "观察：曲线起点处在最高点 1 的位置，并完美地进行单调指数滑跌！"
      },
      {
        title: "经典偏态凸峰 (Classic Skewed Peak)",
        description: "α = 3.0，β = 1.0 (代表在等 3 件事，平均1天发生1件)。峰顶漂移到 x = 2 附近，且右边拖出一段山脊一样的平缓下行线。",
        params: { alpha: 3, beta: 1 },
        focusExplanation: "观察：x=0 处概率密度为 0（因为 0 时间内绝对等不到3件事同时干完）。曲线起锚平滑上升，接着划过不对称的峰顶。"
      },
      {
        title: "高重数极度逼近正态 (Pseudo-Normal)",
        description: "α = 10，β = 3。等待事件的数目增大到 10。很多细长独立的局部等待之和逼近了高斯中位数对称区。",
        params: { alpha: 10, beta: 3 },
        focusExplanation: "观察：此时的峰基本关于均值对称，且分布宽度受β的高偏。随着 α → ∞ 它在极坐标上完美的重塑出正态分布！"
      }
    ],
    stats: (params) => {
      const { alpha, beta } = params;
      return {
        mean: alpha / beta,
        variance: alpha / (beta * beta),
        skewness: 2 / Math.sqrt(alpha),
        kurtosis: 3 + 6 / alpha
      };
    }
  },
  {
    type: "Beta",
    nameCH: "Beta 分布 (Beta)",
    typeCH: "连续型",
    formulaPDF: "f(x) = \\frac{1}{\\text{B}(\\alpha, \\beta)} x^{\\alpha-1} (1-x)^{\\beta-1} \\quad (0 \\le x \\le 1)",
    formulaCDF: "F(x) = I_x(\\alpha, \\beta)",
    pdfLabel: "概率密度 (PDF)",
    description: "Beta分布是定义在 [0, 1] 区间上的连续概率分布。它拥有极强、极为丰富的拓扑塑变能力，通常在贝叶斯统计中用作**二项分布成功概率 p 的先验概率分布**。任何比率、占比、可能性在 0 到 1 之间的未知概率都常用 Beta 来拟合。",
    parameters: [
      {
        name: "alpha",
        label: "先验成功数 (α / alpha)",
        min: 0.1,
        max: 10,
        step: 0.2,
        defaultValue: 2,
        description: "代表成功事件的虚拟观测增度（偏向 X=1 侧的引力）。"
      },
      {
        name: "beta",
        label: "先验失败数 (β / beta)",
        min: 0.1,
        max: 10,
        step: 0.2,
        defaultValue: 2,
        description: "代表失败事件的虚拟观测增度（偏向 X=0 侧的引力）。"
      }
    ],
    examples: [
      {
        title: "广告横幅点击率 (CTR) 概率模型",
        scenario: "某电商新界面，我们希望推估其中某按钮在用户眼中的隐含点击几率（0%~100%）。过去经验中平均看到点击很少，偏向较低占比。可通过 Beta 分布进行概率分布定性。",
        parameterExplanation: "α 和 β 用以表达投放下产生点击与转头离去不点的人数痕迹比例。"
      },
      {
        title: "理财基金的违约概率推算",
        scenario: "信用债理排违约概率评估在 0 到 100% 之间波动。Beta 是最好的受限连续区间插值，它灵活的外边界可以描摹尖峰与凹尾。",
        parameterExplanation: "α 和 β 用以调整先验违约样本和守约样本的比例，决定了违约几率分布曲线形态。"
      }
    ],
    presets: [
      {
        title: "完全无偏平直分布 (Flat Uniform Prior)",
        description: "当先验证据 α 和 β 都等于 1.0 时，Beta分布转变为 [0,1] 上的均匀分布。意味着我们现在彻底无知，各比率概率完全相同！",
        params: { alpha: 1, beta: 1 },
        focusExplanation: "观察：在 0 到 1 范围形成了一条完美水平的几何直线 f(x) = 1.0。"
      },
      {
        title: "双向悬崖两极分化 (U-Shape Dual Peaks)",
        description: "α = 0.5, β = 0.5。当两个参数都小于1，数据表示事件不是彻底暴死不转化（x 偏向 0），就是横扫大获全胜（x 偏向 1），中值极其少见。",
        params: { alpha: 0.5, beta: 0.5 },
        focusExplanation: "观察：极为诡异的“双谷底/双高峰”碗型对称结构。由于两边都贴紧无限，中点 x=0.5 成为塌陷极低值！"
      },
      {
        title: "大样本极强确定性 (Strong Prior Belief)",
        description: "α = 8.0, β = 8.0。有了中等高数成功与失败的相互拉扯，不确定区间急剧压缩到 0.5 中心的小通道内。",
        params: { alpha: 8, beta: 8 },
        focusExplanation: "观察：高度收敛的驼峰形。表明该物理现象有相当稳固的先验锚点，大部分实测概率将牢靠聚拢在中部。"
      },
      {
        title: "右偏非对称低先验 (Skewed Positives)",
        description: "α = 2.0, β = 5.0。成功观测较少，而失败居多。分布向右侧偏斜，数据倾向堆积在中下层区间。",
        params: { alpha: 2, beta: 5 },
        focusExplanation: "观察：最大值点出现在 x 约为 0.16 处，随后往右边逐渐低迷滑坡。"
      }
    ],
    stats: (params) => {
      const { alpha, beta } = params;
      const sum = alpha + beta;
      const prod = alpha * beta;
      const mean = alpha / sum;
      return {
        mean,
        variance: prod / (sum * sum * (sum + 1)),
        skewness: (2 * (beta - alpha) * Math.sqrt(sum + 1)) / ((sum + 2) * Math.sqrt(prod)),
        kurtosis: 3 + (6 * (Math.pow(alpha - beta, 2) * (sum + 1) - prod * (sum + 2))) / (prod * (sum + 2) * (sum + 3))
      };
    }
  }
];
