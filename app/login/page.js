export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">

      {/* Card */}
      <div className="bg-gray-900 border border-gray-700 p-10 rounded-2xl shadow-2xl w-[420px]">

        <h1 className="text-3xl font-bold text-center text-white mb-2">
          Investment & Regret
        </h1>

        <p className="text-center text-gray-400 mb-8">
          Analyze risk & regret before investing
        </p>

        <div className="space-y-4">

          <input
            type="text"
            placeholder="Full Name"
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
          />

        </div>

        <a href="/investment">
          <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-lg font-semibold">
            Get Started →
          </button>
        </a>

      </div>

    </div>
  );
}