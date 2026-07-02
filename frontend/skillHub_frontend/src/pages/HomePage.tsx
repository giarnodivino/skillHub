import { Link } from "react-router-dom";

function HomePage() {
  return (
    <>
      {/* TITLE SECTION */}
      <section>
        <br />
        <div className="text-center p-5">
          <h1 className="text-4xl font-bold">Welcome to NexTask!</h1>
          <p className="mt-2">
            Compare verified contractors, get quotes, and hire the right professional. <strong>all in one place</strong>
          </p>
        </div>
        <div className="buttons flex justify-center gap-4 mt-4">
          <Link to="/about" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-4xl">
            Find a Professional
          </Link>
          <Link to="/register" className="font-bold hover:bg-amber-100 py-2 px-4 rounded-4xl outline-2">
            Create an Account
          </Link>
        </div>
      </section>

      {/* Hire Cards */}
      <section></section>
    </>
  );
}

export default HomePage;
