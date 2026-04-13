import Link from "next/link";

export default function SharedRouteNotFound() {
  return (
    <main className="shared-route-root">
      <section className="shared-route-header">
        <h1>Roteiro nao encontrado</h1>
        <p>Esse link pode ter expirado ou nao existe mais.</p>
        <Link href="/" className="shared-route-primary-btn">
          Voltar para lista
        </Link>
      </section>
    </main>
  );
}
