import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Activity,
  ArrowRight,
  Brain,
  FileText,
  Shield,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Landing() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      setLocation("/chat");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  const handleStartChat = () => {
    setLocation("/chat");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50"
      >
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {APP_LOGO && (
              <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />
            )}
            <span className="text-xl font-bold">{APP_TITLE}</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!loading && (
              <>
                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setLocation("/memory")}>
                      Memory
                    </Button>
                    <Button variant="ghost" onClick={() => setLocation("/database")}>
                      Database
                    </Button>
                    <Button onClick={() => setLocation("/chat")}>
                      Go to Chat
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button variant="ghost" onClick={handleStartChat}>
                      Try as Guest
                    </Button>
                    <Button onClick={handleGetStarted}>Sign In</Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="gradient-bg py-20 md:py-32 overflow-hidden">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4"
            >
              <Activity className="w-4 h-4" />
              Trusted Medical AI Assistant
            </motion.div>
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold tracking-tight"
            >
              Your Trusted Medical{" "}
              <span className="text-primary">AI Assistant</span>
            </motion.h1>
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              Get reliable medical information with trusted citations from
              peer-reviewed sources. Our AI chatbot provides concise, accurate
              responses to your health questions.
            </motion.p>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="text-lg px-8 btn-hover-lift shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Activity className="mr-2 w-5 h-5" />
                  Start Chatting
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleStartChat}
                  className="text-lg px-8 btn-hover-lift"
                >
                  Try as Guest
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose {APP_TITLE}?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built with advanced AI technology and medical expertise to provide
              you with the best health information experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Trusted Sources",
                description: "All responses are backed by reliable medical sources and peer-reviewed research.",
                delay: 0.1
              },
              {
                icon: FileText,
                title: "Comprehensive Citations",
                description: "Every answer includes detailed citations from medical journals and health organizations.",
                delay: 0.2
              },
              {
                icon: Brain,
                title: "Session Memory",
                description: "Remembers your conversation context for more personalized and relevant responses.",
                delay: 0.3
              },
              {
                icon: Users,
                title: "For Everyone",
                description: "Available for both registered users and anonymous visitors with full functionality.",
                delay: 0.4
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay, duration: 0.5 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg h-full dark:bg-card/50 dark:backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4"
                    >
                      <feature.icon className="w-6 h-6 text-primary" />
                    </motion.div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 gradient-bg">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Simple, fast, and reliable medical information in three easy steps.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: "Ask your medical question",
                description: "Type your health-related question in natural language",
                delay: 0.1
              },
              {
                step: 2,
                title: "AI searches trusted sources",
                description: "Our AI analyzes peer-reviewed medical sources and journals",
                delay: 0.3
              },
              {
                step: 3,
                title: "Get concise answer with citations",
                description: "Receive a clear, evidence-based response with source links",
                delay: 0.5
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: item.delay, type: "spring", stiffness: 200 }}
                className="text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4"
                >
                  {item.step}
                </motion.div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-2xl transition-shadow dark:from-primary/10 dark:to-primary/5 dark:bg-card/50 dark:backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-3xl font-bold mb-4"
                >
                  Ready to Get Started?
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-muted-foreground mb-8 max-w-2xl mx-auto"
                >
                  Join thousands of users who trust {APP_TITLE} for reliable
                  medical information.
                </motion.p>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    onClick={handleGetStarted}
                    className="text-lg px-8 btn-hover-lift shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <Activity className="mr-2 w-5 h-5" />
                    Start Your First Chat
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-muted/30">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 {APP_TITLE}. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              <strong>Disclaimer:</strong> This AI provides general medical
              information only. Always consult healthcare professionals for
              medical advice, diagnosis, or treatment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

