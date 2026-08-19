"use client";

import { motion } from "framer-motion";
import {
  Sparkle,
  ChartLineUp,
  Lightning,
  CheckCircle,
  TrendUp,
  Calculator,
  Clock,
  ChartBar,
  ArrowRight,
  Wallet,
  Stack,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

const benefits = [
  {
    icon: Sparkle,
    title: "An extra percentage added to your daily profit",
  },
  {
    icon: Lightning,
    title: "Automatic activation with no manual actions",
  },
  {
    icon: ChartLineUp,
    title: "A transparent bonus shown as a separate line in earnings",
  },
  {
    icon: TrendUp,
    title: "A system that rewards balance, not volume",
  },
];

const howItWorksSteps = [
  {
    icon: Calculator,
    title: "Daily Calculation",
    description:
      "Every day the system calculates your base profit from all active strategies.",
  },
  {
    icon: Stack,
    title: "Multi-Strategy Bonus",
    description:
      "If your capital is spread across more than one strategy, Yield Multiplier applies an additional bonus on top of that profit.",
  },
  {
    icon: ChartBar,
    title: "Balance Matters",
    description:
      "The size of the bonus depends on how many strategies you use and how evenly your funds are distributed between them.",
  },
];

interface YieldLandingPageProps {
  isAuthenticated?: boolean;
}

export function YieldLandingPage({ isAuthenticated = false }: YieldLandingPageProps) {
  const getStartInvestingHref = () => {
    return isAuthenticated ? "/strategies" : "/auth/email";
  };

  const getSignInHref = () => {
    return isAuthenticated ? "/terminal" : "/auth/email";
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto p-8 md:p-12 lg:p-16 space-y-24 md:space-y-32 lg:space-y-40">
        {/* Hero Section */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center space-y-6 pt-8 md:pt-16"
        >
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)', border: '1px solid rgba(255, 253, 182, 0.2)' }}>
              <Sparkle size={20} weight="fill" style={{ color: '#FFFDB6' }} />
              <span className="text-sm font-medium" style={{ color: '#FFFDB6' }}>
                Yield Multiplier
              </span>
            </div>
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white-900"
          >
            Yield Multiplier
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-white-600 max-w-3xl mx-auto"
          >
            Extra daily profit for diversified portfolios
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="text-body text-white-700 max-w-2xl mx-auto leading-relaxed"
          >
            Yield Multiplier is an automatic bonus applied to your daily profit
            when your capital is distributed across multiple strategies.
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="text-body text-white-700 max-w-2xl mx-auto leading-relaxed"
          >
            It rewards diversification and balanced portfolio structure with an
            additional yield on top of your base earnings.
          </motion.p>
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <Link href={getStartInvestingHref()}>
              <Button variant="primary" size="lg" className="group">
                Start Investing
                <ArrowRight
                  size={20}
                  weight="bold"
                  className="ml-2 group-hover:translate-x-1 transition-transform"
                />
              </Button>
            </Link>
            <Link href={getSignInHref()}>
              <Button variant="secondary" size="lg">
                {isAuthenticated ? "Go to Terminal" : "Sign In"}
              </Button>
            </Link>
          </motion.div>
        </motion.section>

        {/* Key Points */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <motion.div
            variants={itemVariants}
            className="p-6 bg-onsurface-900 rounded-xl border border-onsurface-950"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                <Clock size={24} weight="regular" style={{ color: '#FFFDB6' }} />
              </div>
              <div>
                <h3 className="text-heading text-white-900 mb-2">
                  This multiplier affects only today's profit
                </h3>
                <p className="text-body text-white-700">
                  Your invested capital and past profits always remain unchanged.
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="p-6 bg-onsurface-900 rounded-xl border border-onsurface-950"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                <CheckCircle size={24} weight="regular" style={{ color: '#FFFDB6' }} />
              </div>
              <div>
                <h3 className="text-heading text-white-900 mb-2">
                  Yield Multiplier does not change how strategies work
                </h3>
                <p className="text-body text-white-700">
                  It simply enhances the result of a well-structured portfolio.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* What You Get */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white-900 mb-4">
              What You Get
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="p-6 bg-onsurface-900 rounded-xl border border-onsurface-950 transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 253, 182, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                      <Icon size={24} weight="regular" style={{ color: '#FFFDB6' }} />
                    </div>
                    <p className="text-body text-white-900 flex-1">
                      {benefit.title}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* How It Works */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white-900 mb-4">
              How It Works
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {howItWorksSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  className="p-6 bg-onsurface-900 rounded-xl border border-onsurface-950 flex flex-col items-center text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                    <Icon size={32} weight="regular" style={{ color: '#FFFDB6' }} />
                  </div>
                  <h3 className="text-heading text-white-900">{step.title}</h3>
                  <p className="text-body text-white-700">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
          <motion.div
            variants={itemVariants}
            className="p-6 bg-onsurface-900 rounded-xl border border-onsurface-950"
          >
            <div className="space-y-3">
              <p className="text-body text-white-900 font-medium">
                The more balanced your portfolio — the higher the multiplier.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0" />
                  <span className="text-small text-white-700">Calculated daily</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0" />
                  <span className="text-small text-white-700">Applied only to that day's profit</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0" />
                  <span className="text-small text-white-700">Displayed separately in your earnings</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* How to Activate */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white-900 mb-4">
              How to Activate
            </h2>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="p-8 bg-onsurface-900 rounded-xl border border-onsurface-950"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                <Lightning size={24} weight="fill" style={{ color: '#FFFDB6' }} />
              </div>
              <div>
                <h3 className="text-heading text-white-900 mb-4">
                  You don't need to enable anything manually.
                </h3>
                <p className="text-body text-white-700 mb-6">
                  Yield Multiplier activates automatically when:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                    <span className="text-body text-white-900">
                      You invest in more than one strategy
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                    <span className="text-body text-white-900">
                      Your allocations remain relatively balanced
                    </span>
                  </div>
                </div>
                <p className="text-body text-white-700 mt-6">
                  As soon as these conditions are met, the boost becomes active
                  and is instantly visible in your Terminal.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Portfolio Control */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white-900 mb-4">
              Portfolio Control
            </h2>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="p-8 bg-onsurface-900 rounded-xl border border-onsurface-950"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                <ArrowsClockwise size={24} weight="regular" style={{ color: '#FFFDB6' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-heading text-white-900 mb-4">
                  The multiplier adapts dynamically to your portfolio structure
                </h3>
                <p className="text-body text-white-700 mb-6">
                  You can deactivate the effect at any time by:
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#FFFDB6' }} />
                    <span className="text-body text-white-900">
                      Closing strategies
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#FFFDB6' }} />
                    <span className="text-body text-white-900">
                      Changing your allocations
                    </span>
                  </div>
                </div>
                <p className="text-body text-white-700 mb-4">
                  The boost value may change over time depending on:
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#FFFDB6' }} />
                    <span className="text-body text-white-900">Market conditions</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#FFFDB6' }} />
                    <span className="text-body text-white-900">Portfolio balance</span>
                  </div>
                </div>
                <p className="text-body text-white-700">
                  You always stay in full control of your capital and exposure.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="py-16"
        >
          <motion.div
            variants={itemVariants}
            className="p-8 md:p-12 bg-gradient-to-br from-onsurface-900 to-onsurface-950 rounded-2xl border border-onsurface-950 text-center space-y-6"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)', border: '1px solid rgba(255, 253, 182, 0.2)' }}
            >
              <Sparkle size={20} weight="fill" style={{ color: '#FFFDB6' }} />
              <span className="text-sm font-medium" style={{ color: '#FFFDB6' }}>
                Ready to maximize your earnings?
              </span>
            </motion.div>
            <motion.h2
              variants={itemVariants}
              className="text-3xl md:text-4xl font-bold text-white-900"
            >
              Start Building Your Diversified Portfolio
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className="text-body text-white-700 max-w-2xl mx-auto"
            >
              Invest across multiple strategies and watch your Yield Multiplier
              boost your daily profits automatically.
            </motion.p>
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
            >
              <Link href={getStartInvestingHref()}>
                <Button variant="primary" size="lg" className="group">
                  Get Started
                  <ArrowRight
                    size={20}
                    weight="bold"
                    className="ml-2 group-hover:translate-x-1 transition-transform"
                  />
                </Button>
              </Link>
              <Link href={getSignInHref()}>
                <Button variant="secondary" size="lg">
                  {isAuthenticated ? "Go to Terminal" : "Sign In"}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}

