import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-slate-200">404</h1>
        <p className="text-xl font-medium text-slate-600 mt-4">Page not found</p>
        <p className="text-slate-400 mt-2">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="inline-block mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
