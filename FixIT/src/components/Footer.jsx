import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="global-footer">
      <div className="footer-content">
        <p>© {currentYear} FixIT. Todos los derechos reservados.</p>
        <div className="footer-links">
          <Link to="#">Términos de Servicio</Link>
          <Link to="#">Privacidad</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;